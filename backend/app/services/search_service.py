"""
Semantic search using sentence-transformers + FAISS.
Falls back to SQL ILIKE when FAISS is unavailable.
"""
import asyncio
import pickle
from pathlib import Path
from typing import List, Optional, Tuple

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

_model = None
_index = None
_id_map: List[str] = []   # faiss_id -> clipboard_item_id (str)


def _get_model():
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _model = SentenceTransformer(settings.EMBEDDING_MODEL)
            logger.info("Sentence-transformer model loaded: %s", settings.EMBEDDING_MODEL)
        except ImportError:
            logger.warning("sentence-transformers not installed; semantic search disabled")
    return _model


def _get_index():
    global _index, _id_map
    if _index is not None:
        return _index
    index_path = Path(settings.FAISS_INDEX_PATH) / "index.faiss"
    map_path = Path(settings.FAISS_INDEX_PATH) / "id_map.pkl"
    if index_path.exists():
        try:
            import faiss
            _index = faiss.read_index(str(index_path))
            with open(map_path, "rb") as f:
                _id_map = pickle.load(f)
            logger.info("FAISS index loaded (%d vectors)", _index.ntotal)
        except ImportError:
            logger.warning("faiss-cpu not installed; semantic search disabled")
    return _index


def _save_index() -> None:
    import faiss
    idx_dir = Path(settings.FAISS_INDEX_PATH)
    idx_dir.mkdir(parents=True, exist_ok=True)
    faiss.write_index(_index, str(idx_dir / "index.faiss"))
    with open(idx_dir / "id_map.pkl", "wb") as f:
        pickle.dump(_id_map, f)


async def embed_text(text: str) -> Optional[List[float]]:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _sync_embed, text)


def _sync_embed(text: str) -> Optional[List[float]]:
    model = _get_model()
    if model is None:
        return None
    vec = model.encode([text[:512]], normalize_embeddings=True)
    return vec[0].tolist()


async def add_to_index(item_id: str, text: str) -> Optional[int]:
    """Add a clipboard item to the FAISS index. Returns faiss_id."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _sync_add, item_id, text)


def _sync_add(item_id: str, text: str) -> Optional[int]:
    global _index, _id_map
    import numpy as np
    vec = _sync_embed(text)
    if vec is None:
        return None
    try:
        import faiss
        arr = np.array([vec], dtype="float32")
        if _index is None:
            dim = len(vec)
            _index = faiss.IndexFlatIP(dim)  # Inner-product (cosine on normalized vecs)
        _index.add(arr)
        faiss_id = len(_id_map)
        _id_map.append(item_id)
        _save_index()
        return faiss_id
    except ImportError:
        return None


async def semantic_search(query: str, top_k: int = 10) -> List[Tuple[str, float]]:
    """Returns [(item_id, score), ...] sorted by relevance."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _sync_search, query, top_k)


def _sync_search(query: str, top_k: int) -> List[Tuple[str, float]]:
    index = _get_index()
    if index is None or index.ntotal == 0:
        return []
    vec = _sync_embed(query)
    if vec is None:
        return []
    import numpy as np
    arr = np.array([vec], dtype="float32")
    k = min(top_k, index.ntotal)
    scores, ids = index.search(arr, k)
    results = []
    for score, fid in zip(scores[0], ids[0]):
        if fid >= 0 and fid < len(_id_map):
            results.append((_id_map[fid], float(score)))
    return results


async def remove_from_index(faiss_id: int) -> None:
    """FAISS IndexFlatIP does not support removal; mark as tombstone in id_map."""
    global _id_map
    if 0 <= faiss_id < len(_id_map):
        _id_map[faiss_id] = "__deleted__"
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _save_index)
