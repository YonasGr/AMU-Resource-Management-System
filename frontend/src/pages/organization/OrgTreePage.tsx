import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, ChevronDown, Plus, Building2 } from 'lucide-react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardBody } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input, Select, Label } from '../../components/ui/Input';

interface OrgNode {
  id: string;
  name: string;
  type: string;
  status: string;
  children: OrgNode[];
}

const UNIT_TYPES = ['UNIVERSITY', 'COLLEGE', 'DEPARTMENT', 'OFFICE', 'BUREAU', 'DIRECTORATE', 'UNIT'];

function TreeNode({ node, depth, onAdded }: { node: OrgNode; depth: number; onAdded: () => void }) {
  const [expanded, setExpanded] = useState(depth < 1);
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('DEPARTMENT');

  const createMutation = useMutation({
    mutationFn: () => api.post('/organization-units', { name, type, parentId: node.id }),
    onSuccess: () => {
      setName('');
      setShowAddForm(false);
      onAdded();
    },
  });

  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className="group flex items-center gap-1.5 rounded-md py-1.5 pr-2 hover:bg-surface-alt"
        style={{ paddingLeft: `${depth * 20 + 4}px` }}
      >
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex h-5 w-5 shrink-0 items-center justify-center text-muted"
          disabled={!hasChildren}
        >
          {hasChildren ? (
            expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <span className="block h-1 w-1 rounded-full bg-border" />
          )}
        </button>
        <Building2 className="h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={1.5} />
        <span className="text-sm text-ink">{node.name}</span>
        <Badge tone="neutral" className="ml-1">{node.type}</Badge>
        {node.status === 'INACTIVE' && <Badge tone="danger">Inactive</Badge>}
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="ml-auto flex items-center gap-1 rounded px-2 py-0.5 text-xs text-muted opacity-0 hover:bg-white group-hover:opacity-100"
        >
          <Plus className="h-3 w-3" /> Add child
        </button>
      </div>

      {showAddForm && (
        <div
          className="mb-2 mt-1 flex items-end gap-2 rounded-md border border-border bg-white p-3"
          style={{ marginLeft: `${depth * 20 + 28}px` }}
        >
          <div className="w-48">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Physics Department" />
          </div>
          <div className="w-40">
            <Label>Type</Label>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {UNIT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </div>
          <Button
            size="sm"
            disabled={!name || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            Create
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setShowAddForm(false)}>
            Cancel
          </Button>
        </div>
      )}
      {createMutation.isError && (
        <p className="mb-2 text-xs text-danger" style={{ marginLeft: `${depth * 20 + 28}px` }}>
          {(createMutation.error as any)?.response?.data?.message ?? 'Could not create unit.'}
        </p>
      )}

      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} onAdded={onAdded} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrgTreePage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['org-tree'],
    queryFn: async () => (await api.get<{ data: OrgNode[] }>('/organization-units/tree')).data.data,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['org-tree'] });

  return (
    <div>
      <PageHeader
        title="Organization"
        description="The university's structure — every college, department, office, and unit nests here."
      />
      <Card>
        <CardBody>
          {isLoading && <p className="py-8 text-center text-sm text-muted">Loading organization tree…</p>}
          {error && (
            <p className="py-8 text-center text-sm text-danger">
              Couldn't load the organization tree. You may not have access to view it.
            </p>
          )}
          {data?.map((root) => (
            <TreeNode key={root.id} node={root} depth={0} onAdded={refresh} />
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
