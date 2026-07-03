import { useEffect, useState } from 'react';
import { Users, Plus, UserPlus, Trash2, Crown, Eye, Edit2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { workspaceService } from '../services/workspaceService';
import { Header } from '../components/layout/Header';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';
import { relativeTime } from '../utils/format';
const ROLE_ICONS = {
    owner: <Crown className="w-3.5 h-3.5 text-brand-600"/>,
    admin: <Edit2 className="w-3.5 h-3.5 text-gray-900"/>,
    editor: <Edit2 className="w-3.5 h-3.5 text-gray-300"/>,
    viewer: <Eye className="w-3.5 h-3.5 text-gray-500"/>,
};
export function WorkspacesPage() {
    const [workspaces, setWorkspaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [wsName, setWsName] = useState('');
    const [wsDesc, setWsDesc] = useState('');
    const [saving, setSaving] = useState(false);
    const [selectedWs, setSelectedWs] = useState(null);
    const [members, setMembers] = useState([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [showInvite, setShowInvite] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('editor');
    const [inviting, setInviting] = useState(false);
    const load = () => workspaceService.list().then(setWorkspaces).finally(() => setLoading(false));
    useEffect(() => { load(); }, []);
    const loadMembers = async (ws) => {
        setSelectedWs(ws);
        setMembersLoading(true);
        try {
            const m = await workspaceService.members(ws.id);
            setMembers(m);
        }
        finally {
            setMembersLoading(false);
        }
    };
    const createWs = async () => {
        if (!wsName.trim())
            return;
        setSaving(true);
        try {
            await workspaceService.create({ name: wsName.trim(), description: wsDesc || undefined });
            toast.success('Workspace created');
            setShowCreate(false);
            setWsName('');
            setWsDesc('');
            load();
        }
        catch {
            toast.error('Failed to create');
        }
        finally {
            setSaving(false);
        }
    };
    const invite = async () => {
        if (!inviteEmail.trim() || !selectedWs)
            return;
        setInviting(true);
        try {
            const res = await workspaceService.invite(selectedWs.id, inviteEmail.trim(), inviteRole);
            toast.success(res.message);
            setShowInvite(false);
            setInviteEmail('');
            await loadMembers(selectedWs);
        }
        catch {
            toast.error('Failed to invite');
        }
        finally {
            setInviting(false);
        }
    };
    const removeMember = async (userId) => {
        if (!selectedWs || !confirm('Remove this member?'))
            return;
        await workspaceService.removeMember(selectedWs.id, userId);
        toast.success('Member removed');
        await loadMembers(selectedWs);
    };
    return (<div className="flex flex-col min-h-screen">
      <Header title="Workspaces" actions={<Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4"/> New workspace</Button>}/>
      <div className="flex flex-1 overflow-hidden">
        {/* Workspace list */}
        <div className={clsx('overflow-y-auto p-4 sm:p-6', selectedWs ? 'hidden lg:block lg:w-96 lg:border-r lg:border-gray-800' : 'flex-1')}>
          {loading ? (<div className="flex justify-center py-10"><Spinner /></div>) : workspaces.length === 0 ? (<div className="text-center py-20">
              <Users className="w-12 h-12 text-gray-700 mx-auto mb-3"/>
              <p className="text-gray-500 text-sm mb-4">No workspaces yet</p>
              <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4"/> Create workspace</Button>
            </div>) : (<div className="space-y-3">
              {workspaces.map((ws) => (<button key={ws.id} onClick={() => loadMembers(ws)} className={clsx('w-full text-left bg-gray-900 border rounded-xl p-4 transition-all', selectedWs?.id === ws.id ? 'border-brand-600 shadow-soft' : 'border-gray-800 hover:border-brand-700')}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-600/20 rounded-xl flex items-center justify-center text-brand-600 font-bold text-sm">
                      {ws.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-100 truncate">{ws.name}</h3>
                      {ws.description && <p className="text-sm text-gray-500 truncate">{ws.description}</p>}
                      <p className="text-xs text-gray-600 mt-0.5">{ws.member_count} member{ws.member_count !== 1 ? 's' : ''} · /{ws.slug}</p>
                    </div>
                  </div>
                </button>))}
            </div>)}
        </div>

        {/* Members panel */}
        {selectedWs && (<div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="flex items-center justify-between mb-5 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <button onClick={() => setSelectedWs(null)} className="p-1.5 -ml-1.5 text-gray-400 hover:text-gray-900 lg:hidden shrink-0" aria-label="Back to workspaces">
                  <ArrowLeft className="w-5 h-5"/>
                </button>
                <h2 className="text-lg font-semibold text-gray-100 truncate">{selectedWs.name} — Members</h2>
              </div>
              <Button size="sm" onClick={() => setShowInvite(true)}><UserPlus className="w-4 h-4"/> Invite</Button>
            </div>
            {membersLoading ? (<div className="flex justify-center py-10"><Spinner /></div>) : (<div className="space-y-2">
                {members.map((m) => (<div key={m.user_id} className="flex items-center gap-3 surface p-4">
                    <div className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center text-sm font-semibold text-gray-300">
                      {m.username[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200">{m.full_name ?? m.username}</p>
                      <p className="text-xs text-gray-500">{m.username} · joined {relativeTime(m.joined_at)}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {ROLE_ICONS[m.role]}
                      <span className="text-xs text-gray-400 capitalize">{m.role}</span>
                    </div>
                    {m.role !== 'owner' && (<button onClick={() => removeMember(m.user_id)} className="p-1.5 text-gray-600 hover:text-red-400 rounded-lg transition-colors ml-1">
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>)}
                  </div>))}
              </div>)}
          </div>)}
      </div>

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New workspace">
        <div className="space-y-4">
          <Input label="Name" value={wsName} onChange={(e) => setWsName(e.target.value)} placeholder="My team"/>
          <Input label="Description (optional)" value={wsDesc} onChange={(e) => setWsDesc(e.target.value)} placeholder="What does this team work on?"/>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button loading={saving} onClick={createWs} disabled={!wsName.trim()}>Create</Button>
          </div>
        </div>
      </Modal>

      {/* Invite modal */}
      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Invite member">
        <div className="space-y-4">
          <Input label="Email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@example.com"/>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Role</label>
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowInvite(false)}>Cancel</Button>
            <Button loading={inviting} onClick={invite} disabled={!inviteEmail.trim()}>Send invite</Button>
          </div>
        </div>
      </Modal>
    </div>);
}
