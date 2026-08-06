import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Plus } from "lucide-react";
import { api } from "../../lib/api";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Badge, statusTone } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input, Label, Select } from "../../components/ui/Input";

type Tab = "registry" | "borrowing" | "disposals";
interface Item {
  id: string;
  name: string;
  assetType: string;
}
interface Store {
  id: string;
  name: string;
}
interface Asset {
  id: string;
  assetTag: string;
  serialNumber?: string;
  condition: string;
  status: string;
  item: Item;
  store: Store;
}
interface Loan {
  id: string;
  status: string;
  purpose: string;
  expectedReturnDate: string;
  asset: Asset;
  borrower: { fullName: string };
}
interface Disposal {
  id: string;
  certificateNumber: string;
  reason: string;
  method: string;
  disposedAt: string;
  asset: Asset;
}
interface GoodsReceipt {
  id: string;
  receiptNumber: string;
  store: Store;
  lines: Array<{ id: string; acceptedQuantity: number; item: Item }>;
}

export default function AssetsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("registry");
  const [form, setForm] = useState({
    assetTag: "",
    serialNumber: "",
    itemId: "",
    storeId: "",
    purchaseDate: "",
    goodsReceiptLineId: "",
  });
  const [inspection, setInspection] = useState<
    Record<string, { condition: string; notes: string }>
  >({});
  const assets = useQuery({
    queryKey: ["assets"],
    queryFn: async () =>
      (await api.get<{ data: Asset[] }>("/assets")).data.data,
  });
  const loans = useQuery({
    queryKey: ["borrow-transactions"],
    queryFn: async () =>
      (await api.get<{ data: Loan[] }>("/assets/borrowing")).data.data,
  });
  const disposals = useQuery({
    queryKey: ["disposal-records"],
    queryFn: async () =>
      (await api.get<{ data: Disposal[] }>("/assets/disposals/records")).data
        .data,
  });
  const items = useQuery({
    queryKey: ["items-for-assets"],
    queryFn: async () => (await api.get<{ data: Item[] }>("/items")).data.data,
  });
  const stores = useQuery({
    queryKey: ["stores-for-assets"],
    queryFn: async () =>
      (await api.get<{ data: Store[] }>("/stores/directory")).data.data,
  });
  const receipts = useQuery({
    queryKey: ["goods-receipts-for-assets"],
    queryFn: async () =>
      (await api.get<{ data: GoodsReceipt[] }>("/procurement/goods-receipts"))
        .data.data,
  });
  const refresh = () =>
    ["assets", "borrow-transactions", "disposal-records", "inventory"].forEach(
      (key) => queryClient.invalidateQueries({ queryKey: [key] }),
    );
  const create = useMutation({
    mutationFn: () =>
      api.post("/assets", {
        ...form,
        serialNumber: form.serialNumber || undefined,
        purchaseDate: form.purchaseDate || undefined,
        goodsReceiptLineId: form.goodsReceiptLineId || undefined,
      }),
    onSuccess: () => {
      setForm({
        assetTag: "",
        serialNumber: "",
        itemId: "",
        storeId: "",
        purchaseDate: "",
        goodsReceiptLineId: "",
      });
      refresh();
    },
  });
  const action = useMutation({
    mutationFn: ({ id, kind }: { id: string; kind: string }) =>
      api.post(
        `/assets/borrowing/${id}/${kind}`,
        kind === "inspect" ? inspection[id] : {},
      ),
    onSuccess: refresh,
  });
  const download = async (record: Disposal) => {
    const response = await api.get(
      `/assets/disposals/${record.id}/certificate`,
      { responseType: "blob" },
    );
    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${record.certificateNumber}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const field = (name: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [name]: value }));
  const receiptOptions =
    receipts.data?.flatMap((receipt) =>
      receipt.lines
        .filter((line) => line.item.assetType === "FIXED_ASSET")
        .map((line) => ({ receipt, line })),
    ) ?? [];

  return (
    <div>
      <PageHeader
        title="Assets"
        description="Unit-level registry, borrowing custody, returns, inspections and disposal certificates."
      />
      <div className="mb-5 flex flex-wrap gap-2">
        {(["registry", "borrowing", "disposals"] as Tab[]).map((value) => (
          <Button
            key={value}
            variant={tab === value ? "primary" : "secondary"}
            onClick={() => setTab(value)}
          >
            {value === "registry"
              ? "Asset Registry"
              : value === "borrowing"
                ? "Borrowing & Returns"
                : "Disposals"}
          </Button>
        ))}
      </div>

      {tab === "registry" && (
        <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
          <Card>
            <CardHeader className="font-medium">
              Register inventory unit
            </CardHeader>
            <CardBody className="space-y-3">
              <div>
                <Label>Asset tag</Label>
                <Input
                  value={form.assetTag}
                  onChange={(e) => field("assetTag", e.target.value)}
                  placeholder="AMU-ICT-0001"
                />
              </div>
              <div>
                <Label>Serial number</Label>
                <Input
                  value={form.serialNumber}
                  onChange={(e) => field("serialNumber", e.target.value)}
                />
              </div>
              <div>
                <Label>Purchase receipt (optional)</Label>
                <Select
                  value={form.goodsReceiptLineId}
                  onChange={(event) => {
                    const selected = receiptOptions.find(
                      ({ line }) => line.id === event.target.value,
                    );
                    setForm((current) => ({
                      ...current,
                      goodsReceiptLineId: event.target.value,
                      itemId: selected?.line.item.id ?? current.itemId,
                      storeId: selected?.receipt.store.id ?? current.storeId,
                    }));
                  }}
                >
                  <option value="">Opening balance / no receipt link</option>
                  {receiptOptions.map(({ receipt, line }) => (
                    <option key={line.id} value={line.id}>
                      {receipt.receiptNumber} — {line.item.name} (
                      {line.acceptedQuantity} accepted)
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Fixed-asset item</Label>
                <Select
                  value={form.itemId}
                  onChange={(e) => field("itemId", e.target.value)}
                >
                  <option value="">Select item…</option>
                  {items.data
                    ?.filter((item) => item.assetType === "FIXED_ASSET")
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </Select>
              </div>
              <div>
                <Label>Custodial store</Label>
                <Select
                  value={form.storeId}
                  onChange={(e) => field("storeId", e.target.value)}
                >
                  <option value="">Select store…</option>
                  {stores.data?.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Purchase date</Label>
                <Input
                  type="date"
                  value={form.purchaseDate}
                  onChange={(e) => field("purchaseDate", e.target.value)}
                />
              </div>
              <Button
                disabled={
                  !form.assetTag ||
                  !form.itemId ||
                  !form.storeId ||
                  create.isPending
                }
                onClick={() => create.mutate()}
              >
                <Plus className="h-4 w-4" /> Register
              </Button>
              {create.isError && (
                <p className="text-xs text-danger">
                  {(create.error as any)?.response?.data?.message ??
                    "Could not register asset."}
                </p>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader className="font-medium">
              Registered assets ({assets.data?.length ?? 0})
            </CardHeader>
            <CardBody className="overflow-x-auto p-0">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-surface-subtle text-xs uppercase text-muted">
                  <tr>
                    <th className="px-4 py-3">Tag / serial</th>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Store</th>
                    <th className="px-4 py-3">Condition</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.data?.map((asset) => (
                    <tr
                      key={asset.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-4 py-3 font-medium">
                        {asset.assetTag}
                        <span className="block text-xs font-normal text-muted">
                          {asset.serialNumber ?? "No serial"}
                        </span>
                      </td>
                      <td className="px-4 py-3">{asset.item.name}</td>
                      <td className="px-4 py-3">{asset.store.name}</td>
                      <td className="px-4 py-3">
                        <Badge>{asset.condition}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={statusTone(asset.status)}>
                          {asset.status.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 space-x-1">
                        {(asset.status === "UNDER_MAINTENANCE" || asset.status === "UNDER_INSPECTION") && (
                          <Button
                            variant="secondary"
                            className="px-2 py-1 text-xs"
                            onClick={() =>
                              api
                                .post(`/assets/${asset.id}/complete-maintenance`)
                                .then(refresh)
                            }
                          >
                            Complete Maint.
                          </Button>
                        )}
                        {asset.assignedOrganizationId && (
                          <Button
                            variant="secondary"
                            className="px-2 py-1 text-xs"
                            onClick={() =>
                              api
                                .post(`/assets/${asset.id}/unassign`)
                                .then(refresh)
                            }
                          >
                            Unassign
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {assets.data?.length === 0 && (
                <p className="p-6 text-sm text-muted">
                  No assets registered. Add inventory before registering its
                  individual units.
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {tab === "borrowing" && (
        <div className="space-y-3">
          {loans.data?.map((loan) => (
            <Card key={loan.id}>
              <CardBody className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium">
                    {loan.asset.assetTag} · {loan.asset.item.name}
                  </p>
                  <p className="text-sm text-muted">
                    {loan.borrower.fullName} · due{" "}
                    {new Date(loan.expectedReturnDate).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-muted">{loan.purpose}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={statusTone(loan.status)}>
                    {loan.status.replace(/_/g, " ")}
                  </Badge>
                  {loan.status === "APPROVED" && (
                    <Button
                      size="sm"
                      onClick={() =>
                        action.mutate({ id: loan.id, kind: "issue" })
                      }
                    >
                      Issue
                    </Button>
                  )}
                  {loan.status === "ISSUED" && (
                    <Button
                      size="sm"
                      onClick={() =>
                        action.mutate({ id: loan.id, kind: "return" })
                      }
                    >
                      Record return
                    </Button>
                  )}
                  {loan.status === "RETURNED_PENDING_INSPECTION" && (
                    <>
                      <Select
                        className="w-32"
                        value={inspection[loan.id]?.condition ?? ""}
                        onChange={(e) =>
                          setInspection((all) => ({
                            ...all,
                            [loan.id]: {
                              condition: e.target.value,
                              notes: all[loan.id]?.notes ?? "",
                            },
                          }))
                        }
                      >
                        <option value="">Condition…</option>
                        {["NEW", "GOOD", "FAIR", "POOR", "DAMAGED"].map(
                          (value) => (
                            <option key={value}>{value}</option>
                          ),
                        )}
                      </Select>
                      <Input
                        className="w-44"
                        placeholder="Inspection notes"
                        value={inspection[loan.id]?.notes ?? ""}
                        onChange={(e) =>
                          setInspection((all) => ({
                            ...all,
                            [loan.id]: {
                              condition: all[loan.id]?.condition ?? "",
                              notes: e.target.value,
                            },
                          }))
                        }
                      />
                      <Button
                        size="sm"
                        disabled={
                          !inspection[loan.id]?.condition ||
                          (inspection[loan.id]?.notes.length ?? 0) < 2
                        }
                        onClick={() =>
                          action.mutate({ id: loan.id, kind: "inspect" })
                        }
                      >
                        Complete inspection
                      </Button>
                    </>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
          {loans.data?.length === 0 && (
            <Card>
              <CardBody className="text-sm text-muted">
                No borrowing transactions. Create and approve a Borrow Asset
                request first.
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {tab === "disposals" && (
        <Card>
          <CardBody className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-subtle text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">Certificate</th>
                  <th className="px-4 py-3">Asset</th>
                  <th className="px-4 py-3">Reason / method</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {disposals.data?.map((record) => (
                  <tr
                    key={record.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-3 font-mono text-xs">
                      {record.certificateNumber}
                    </td>
                    <td className="px-4 py-3">
                      {record.asset.assetTag}
                      <span className="block text-xs text-muted">
                        {record.asset.item.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {record.reason}
                      <span className="block text-xs text-muted">
                        {record.method}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {new Date(record.disposedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => download(record)}
                      >
                        <Download className="h-4 w-4" /> PDF
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {disposals.data?.length === 0 && (
              <p className="p-6 text-sm text-muted">No disposal records.</p>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
