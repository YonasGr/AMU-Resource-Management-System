import React, { useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Repeat,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Sliders,
  History,
  ArrowRightLeft,
  Package,
  Boxes,
  Building2,
  User,
  Truck,
  FileText,
  AlertTriangle,
  QrCode,
  MapPin,
  Sparkles,
} from "lucide-react";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/auth.store";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
} from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import {
  Input,
  Select,
  Label,
  Textarea,
  SearchInput,
} from "../../components/ui/Input";
import { EmptyState } from "../../components/ui/EmptyState";
import {
  AuditorModeBadge,
  InventoryDocumentShell,
  InventoryDocumentTab,
  InventoryTabId,
} from "../../components/inventory/InventoryDocumentShell";
import { ReceivingWorkspace } from "../../components/inventory/ReceivingWorkspace";
import { StockOutWorkspace } from "../../components/inventory/StockOutWorkspace";
import {
  ReturnsWorkspace,
  IssuedRequest,
} from "../../components/inventory/ReturnsWorkspace";
import { AdjustmentWorkspace } from "../../components/inventory/AdjustmentWorkspace";
import { TransferWorkspace } from "../../components/inventory/TransferWorkspace";
import { InventoryHistoryWorkspace } from "../../components/inventory/InventoryHistoryWorkspace";
import { InventoryItemPreview } from "../../components/inventory/InventoryItemPreview";
import { InventoryTrackingValue } from "../../components/inventory/InventoryTrackingFields";
import { WarehouseMaterial } from "../../components/inventory/WarehouseMaterialPicker";
import {
  BatchMovementLine,
  BatchMovementResult,
  BatchMovementQueue,
} from "../../components/inventory/BatchMovementQueue";

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAuditor = user?.role === "AUDITOR";
  const isKeeper =
    user?.role === "STOREKEEPER" ||
    user?.role === "STORE_MANAGER" ||
    user?.role === "ADMINISTRATOR";
  const canAdjustStock =
    user?.role === "STORE_MANAGER" || user?.role === "ADMINISTRATOR";
  const canMutateStock = isKeeper;

  const [activeTab, setActiveTab] = useState<InventoryTabId>(
    isAuditor ? "history" : "receipt",
  );

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Common Form States
  const [materialId, setMaterialId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [supplierId, setSupplierId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [purpose, setPurpose] = useState("");
  const [deliveryReference, setDeliveryReference] = useState("");
  const [remarks, setRemarks] = useState("");
  const [newQuantity, setNewQuantity] = useState(0);
  const [adjustReasonCode, setAdjustReasonCode] = useState("");
  const [adjustRemarks, setAdjustRemarks] = useState("");
  const [breakGlass, setBreakGlass] = useState(false);
  const [returnRequestId, setReturnRequestId] = useState("");
  const [returnRequestItemId, setReturnRequestItemId] = useState("");
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [tracking, setTracking] = useState<InventoryTrackingValue>({
    lotNumber: "",
    batchNumber: "",
    expiryDate: "",
    serialNumber: "",
  });

  // Ledger Filter State
  const [historySearch, setHistorySearch] = useState("");
  const [historyTypeFilter, setHistoryTypeFilter] = useState("ALL");
  const [historyMaterialId, setHistoryMaterialId] = useState("");
  const [historySort, setHistorySort] = useState<"createdAt" | "quantity">(
    "createdAt",
  );

  // Each workflow owns its draft boundary; switching tabs must not carry quantities,
  // recipients, or authorization fields into another inventory operation.
  const handleTabChange = (tab: InventoryTabId) => {
    setActiveTab(tab);
    setFeedback(null);
    setMaterialId("");
    setQuantity(1);
    setSupplierId("");
    setEmployeeId("");
    setDepartmentId("");
    setPurpose("");
    setDeliveryReference("");
    setRemarks("");
    setNewQuantity(0);
    setAdjustReasonCode("");
    setAdjustRemarks("");
    setBreakGlass(false);
    setReturnRequestId("");
    setReturnRequestItemId("");
    setReturnQuantity(1);
    setTracking({
      lotNumber: "",
      batchNumber: "",
      expiryDate: "",
      serialNumber: "",
    });
  };

  // Fetch Materials
  const { data: materials } = useQuery({
    queryKey: ["materials"],
    queryFn: async () => {
      const res = await api.get("/materials");
      return res.data.data ?? res.data;
    },
  });

  // Fetch Suppliers
  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await api.get("/suppliers");
      return res.data.data ?? res.data;
    },
  });

  // Fetch Employees
  const { data: employees } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const res = await api.get("/employees");
      return res.data.data ?? res.data;
    },
  });

  // Fetch Departments
  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const res = await api.get("/employees/departments");
      return res.data.data ?? res.data;
    },
  });

  const { data: issuedRequests } = useQuery({
    queryKey: ["material-requests", "issued-returnable"],
    queryFn: async () => {
      const res = await api.get("/requests");
      return (res.data.data ?? res.data).filter(
        (request: any) =>
          request.status === "ISSUED" &&
          request.items?.some(
            (item: any) => item.quantityIssued > (item.quantityReturned ?? 0),
          ),
      );
    },
    enabled: activeTab === "return",
  });

  const selectedReturnRequest = issuedRequests?.find(
    (request: any) => request.id === returnRequestId,
  ) as IssuedRequest | undefined;
  const selectedReturnItem = selectedReturnRequest?.items?.find(
    (item: any) => item.id === returnRequestItemId,
  );
  const returnableItems =
    selectedReturnRequest?.items?.filter(
      (item: any) => item.quantityIssued > (item.quantityReturned ?? 0),
    ) ?? [];
  const returnableQuantity = selectedReturnItem
    ? selectedReturnItem.quantityIssued -
      (selectedReturnItem.quantityReturned ?? 0)
    : 0;

  // Fetch Transactions
  const {
    data: transactionPages,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: [
      "inventory-transactions",
      historySearch,
      historyTypeFilter,
      historyMaterialId,
      historySort,
    ],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const res = await api.get("/inventory/transactions", {
        params: {
          ...(pageParam ? { cursor: pageParam } : {}),
          ...(historySearch.trim() ? { search: historySearch.trim() } : {}),
          ...(historyTypeFilter !== "ALL" ? { type: historyTypeFilter } : {}),
          ...(historyMaterialId ? { materialId: historyMaterialId } : {}),
          sortBy: historySort,
          sortOrder: "desc",
          limit: 50,
        },
      });
      return res.data.data ?? res.data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  // Mutations
  const receiptMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post("/inventory/receipts", data);
      return res.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      const code = data?.data?.receiptCode || data?.receiptCode || "";
      setFeedback({
        type: "success",
        message: `Goods receipt draft created successfully. ${code ? `Receipt Code: ${code}` : ""}`,
      });
      resetForm();
    },
    onError: (err: any) => {
      setFeedback({
        type: "error",
        message:
          err.response?.data?.message ||
          err.message ||
          "Failed to create goods receipt draft",
      });
    },
  });

  const stockOutMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post("/inventory/stock-out", data);
      return res.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      const code = data?.data?.transactionCode || data?.transactionCode || "";
      setFeedback({
        type: "success",
        message: `Stock Out issued successfully! ${code ? `Transaction Code: ${code}` : ""}`,
      });
      resetForm();
    },
    onError: (err: any) => {
      setFeedback({
        type: "error",
        message:
          err.response?.data?.message ||
          err.message ||
          "Failed to issue Stock Out",
      });
    },
  });

  const returnMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post("/inventory/return", data);
      return res.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      queryClient.invalidateQueries({ queryKey: ["material-requests"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      const code = data?.data?.transactionCode || data?.transactionCode || "";
      setFeedback({
        type: "success",
        message: `Return to stock recorded successfully! ${code ? `Transaction Code: ${code}` : ""}`,
      });
      resetForm();
      setReturnRequestId("");
      setReturnRequestItemId("");
      setReturnQuantity(1);
    },
    onError: (err: any) => {
      setFeedback({
        type: "error",
        message:
          err.response?.data?.message ||
          err.message ||
          "Failed to process Return",
      });
    },
  });

  const adjustMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post("/inventory/adjustment", data);
      return res.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      const code = data?.data?.transactionCode || data?.transactionCode || "";
      setFeedback({
        type: "success",
        message: `Stock adjustment audit recorded successfully! ${code ? `Transaction Code: ${code}` : ""}`,
      });
      resetForm();
    },
    onError: (err: any) => {
      setFeedback({
        type: "error",
        message:
          err.response?.data?.message ||
          err.message ||
          "Failed to adjust stock",
      });
    },
  });

  const transferMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post("/inventory/transfer", data);
      return res.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      const code = data?.data?.transactionCode || data?.transactionCode || "";
      setFeedback({
        type: "success",
        message: `Material transfer logged successfully! ${code ? `Transaction Code: ${code}` : ""}`,
      });

      resetForm();
    },
    onError: (err: any) => {
      setFeedback({
        type: "error",
        message:
          err.response?.data?.message ||
          err.message ||
          "Failed to record transfer",
      });
    },
  });

  const batchMutation = useMutation({
    mutationFn: async (data: {
      operation: "RECEIPT" | "STOCK_OUT" | "TRANSFER";
      lines: Array<
        BatchMovementLine & {
          supplierId?: string;
          employeeId?: string;
          departmentId?: string;
          sourceStoreId?: string;
          destinationStoreId?: string;
        }
      >;
    }): Promise<
      BatchMovementResult & { succeeded?: number; failed?: number }
    > => {
      const res = await api.post("/inventory/batch", data);
      return res.data?.data ?? res.data;
    },
    onSuccess: (
      result: BatchMovementResult & { succeeded?: number; failed?: number },
    ) => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setFeedback({
        type: result.failed ? "error" : "success",
        message: `Batch posted: ${result.succeeded ?? 0} succeeded, ${result.failed ?? 0} failed. Review failed lines before retrying.`,
      });
    },
    onError: (err: any) => {
      setFeedback({
        type: "error",
        message:
          err.response?.data?.message ||
          err.message ||
          "Failed to post batch movements",
      });
    },
  });

  const resetForm = () => {
    setMaterialId("");
    setQuantity(1);
    setSupplierId("");
    setEmployeeId("");
    setDepartmentId("");
    setPurpose("");
    setDeliveryReference("");
    setRemarks("");
    setNewQuantity(0);
    setAdjustReasonCode("");
    setAdjustRemarks("");
    setBreakGlass(false);
    setTracking({
      lotNumber: "",
      batchNumber: "",
      expiryDate: "",
      serialNumber: "",
    });
  };

  const handleReceiptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    receiptMutation.mutate({
      materialId,
      storeId: user?.storeId,
      quantityReceived: Number(quantity),
      supplierId: supplierId || undefined,
      deliveryReference: deliveryReference || undefined,
      remarks,
      lotNumber: tracking.lotNumber || undefined,
      batchNumber: tracking.batchNumber || undefined,
      expiryDate: tracking.expiryDate || undefined,
      serialNumber: tracking.serialNumber || undefined,
    });
  };

  const handleStockOutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    stockOutMutation.mutate({
      materialId,
      quantity: Number(quantity),
      employeeId: employeeId || undefined,
      departmentId: departmentId || undefined,
      purpose,
      remarks,
      lotNumber: tracking.lotNumber || undefined,
      batchNumber: tracking.batchNumber || undefined,
      expiryDate: tracking.expiryDate || undefined,
      serialNumber: tracking.serialNumber || undefined,
    });
  };

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    returnMutation.mutate({
      requestId: returnRequestId,
      requestItemId: returnRequestItemId,
      materialId,
      quantity: Number(returnQuantity),
      departmentId: selectedReturnRequest?.departmentId,
      remarks,
      lotNumber: tracking.lotNumber || undefined,
      batchNumber: tracking.batchNumber || undefined,
      expiryDate: tracking.expiryDate || undefined,
      serialNumber: tracking.serialNumber || undefined,
    });
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    transferMutation.mutate({
      materialId,
      quantity: Number(quantity),
      toDepartmentId: departmentId,
      purpose,
      remarks,
      lotNumber: tracking.lotNumber || undefined,
      batchNumber: tracking.batchNumber || undefined,
      expiryDate: tracking.expiryDate || undefined,
      serialNumber: tracking.serialNumber || undefined,
    });
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    adjustMutation.mutate({
      materialId,
      newQuantity: Number(newQuantity),
      reasonCode: adjustReasonCode,
      remarks: adjustRemarks,
      breakGlass,
    });
  };

  const handleBatchSubmit = (
    lines: BatchMovementLine[],
  ): Promise<BatchMovementResult> => {
    const operation =
      activeTab === "receipt"
        ? "RECEIPT"
        : activeTab === "out"
          ? "STOCK_OUT"
          : "TRANSFER";
    return batchMutation.mutateAsync({
      operation,
      lines: lines.map((line) => ({
        ...line,
        supplierId: supplierId || undefined,
        employeeId: employeeId || undefined,
        departmentId: departmentId || undefined,
        sourceStoreId: user?.storeId || undefined,
      })),
    });
  };

  const selectedMaterialObj = materials?.find(
    (m: any) => m.id === materialId,
  ) as WarehouseMaterial | undefined;

  const transactions = transactionPages?.pages.flatMap((page) => page.items) ?? [];
  const asOf = transactionPages?.pages[transactionPages.pages.length - 1]?.asOf;

  const operationTabs: InventoryDocumentTab[] = [
    ...(!isAuditor && canMutateStock
      ? ([
          {
            id: "receipt",
            label: "Goods Receipt Draft",
            icon: ArrowDownLeft,
            activeClassName: "bg-emerald-600",
          },
          {
            id: "out",
            label: "Direct Stock Out",
            icon: ArrowUpRight,
            activeClassName: "bg-cyan-600",
          },
          {
            id: "return",
            label: "Request Returns",
            icon: RotateCcw,
            activeClassName: "bg-amber-600",
          },
          {
            id: "adjust",
            label: "Stock Adjustments",
            icon: Sliders,
            activeClassName: "bg-purple-600",
          },
          {
            id: "transfer",
            label: "Store Transfer",
            icon: ArrowRightLeft,
            activeClassName: "bg-teal-700",
          },
        ] as InventoryDocumentTab[])
      : []),
    {
      id: "history",
      label: "Transaction History Ledger",
      icon: History,
      activeClassName: "bg-brand-900",
      count: transactions?.length ?? 0,
    },
  ];

  return (
    <InventoryDocumentShell
      title={
        isAuditor ? "Inventory Audit Ledger" : "Inventory Operations & Ledger"
      }
      description={
        isAuditor
          ? "Independent compliance inspection ledger of all university physical stock transactions, supplier deliveries, and departmental issuances."
          : "Execute physical stock movements, supplier shipments, direct issues, departmental transfers, and audit adjustments."
      }
      headerIcon={Repeat}
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "Inventory Operations" },
      ]}
      headerActions={isAuditor ? <AuditorModeBadge /> : undefined}
      tabs={operationTabs}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      feedback={feedback}
      onDismissFeedback={() => setFeedback(null)}
      roleGuidance={
        !isKeeper && activeTab !== "history" ? (
          <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-bold">
                Store Operator Privilege Required for Execution
              </p>
              <p className="mt-0.5 text-amber-700">
                You are viewing this operation in preview mode as{" "}
                <strong>{user?.role?.replace("_", " ")}</strong>. To record
                official stock movements, log in as <strong>Storekeeper</strong>
                , <strong>Store Manager</strong>, or{" "}
                <strong>Administrator</strong>.
              </p>
            </div>
          </div>
        ) : null
      }
    >
      {/* 2-Column Workflow for Active Form */}
      {activeTab !== "history" ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left Form (2 cols) */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>
                    {activeTab === "receipt" && "Create Goods Receipt Draft"}
                    {activeTab === "out" &&
                      "Record Direct Stock Out (Store Issuance)"}
                    {activeTab === "return" && "Record Return Against Request"}
                    {activeTab === "adjust" &&
                      "Manual Physical Stock Audit Adjustment"}
                    {activeTab === "transfer" &&
                      "Record Store Department Transfer"}
                  </CardTitle>
                  <CardDescription>
                    {activeTab === "return"
                      ? "Select the issued request and item. Returns are capped at the outstanding quantity and recorded against that request."
                      : "Fill in the transaction details to update current inventory balances and log audit records."}
                  </CardDescription>
                </div>
              </CardHeader>

              <CardBody>
                {activeTab === "receipt" && (
                  <ReceivingWorkspace
                    materials={materials}
                    suppliers={suppliers}
                    materialId={materialId}
                    quantity={quantity}
                    supplierId={supplierId}
                    deliveryReference={deliveryReference}
                    remarks={remarks}
                    tracking={tracking}
                    isKeeper={isKeeper}
                    isPending={receiptMutation.isPending}
                    onMaterialChange={setMaterialId}
                    onQuantityChange={setQuantity}
                    onSupplierChange={setSupplierId}
                    onDeliveryReferenceChange={setDeliveryReference}
                    onRemarksChange={setRemarks}
                    onTrackingChange={setTracking}
                    onSubmit={handleReceiptSubmit}
                  />
                )}

                {activeTab === "out" && (
                  <StockOutWorkspace
                    materials={materials}
                    employees={employees}
                    departments={departments}
                    materialId={materialId}
                    quantity={quantity}
                    employeeId={employeeId}
                    departmentId={departmentId}
                    purpose={purpose}
                    remarks={remarks}
                    tracking={tracking}
                    isKeeper={isKeeper}
                    isPending={stockOutMutation.isPending}
                    onMaterialChange={setMaterialId}
                    onQuantityChange={setQuantity}
                    onEmployeeChange={setEmployeeId}
                    onDepartmentChange={setDepartmentId}
                    onPurposeChange={setPurpose}
                    onRemarksChange={setRemarks}
                    onTrackingChange={setTracking}
                    onSubmit={handleStockOutSubmit}
                  />
                )}

                {activeTab === "return" && (
                  <ReturnsWorkspace
                    issuedRequests={
                      issuedRequests as IssuedRequest[] | undefined
                    }
                    selectedItem={selectedReturnItem}
                    returnableItems={returnableItems}
                    returnableQuantity={returnableQuantity}
                    requestId={returnRequestId}
                    requestItemId={returnRequestItemId}
                    quantity={returnQuantity}
                    remarks={remarks}
                    materials={materials}
                    tracking={tracking}
                    isKeeper={isKeeper}
                    isPending={returnMutation.isPending}
                    onRequestChange={(requestId) => {
                      const request = issuedRequests?.find(
                        (item: any) => item.id === requestId,
                      );
                      const firstReturnable = request?.items?.find(
                        (item: any) =>
                          item.quantityIssued > (item.quantityReturned ?? 0),
                      );
                      setReturnRequestId(requestId);
                      setReturnRequestItemId(firstReturnable?.id ?? "");
                      setMaterialId(firstReturnable?.materialId ?? "");
                      setReturnQuantity(1);
                    }}
                    onItemChange={(itemId) => {
                      const item = selectedReturnRequest?.items?.find(
                        (row: any) => row.id === itemId,
                      );
                      setReturnRequestItemId(itemId);
                      setMaterialId(item?.materialId ?? "");
                      setReturnQuantity(1);
                    }}
                    onQuantityChange={setReturnQuantity}
                    onRemarksChange={setRemarks}
                    onTrackingChange={setTracking}
                    onSubmit={handleReturnSubmit}
                  />
                )}

                {activeTab === "adjust" && (
                  <AdjustmentWorkspace
                    materials={materials}
                    materialId={materialId}
                    newQuantity={newQuantity}
                    reasonCode={adjustReasonCode}
                    remarks={adjustRemarks}
                    breakGlass={breakGlass}
                    canAdjust={canAdjustStock}
                    isAdministrator={user?.role === "ADMINISTRATOR"}
                    isPending={adjustMutation.isPending}
                    onMaterialChange={setMaterialId}
                    onQuantityChange={setNewQuantity}
                    onReasonCodeChange={setAdjustReasonCode}
                    onRemarksChange={setAdjustRemarks}
                    onBreakGlassChange={setBreakGlass}
                    onSubmit={handleAdjustSubmit}
                  />
                )}

                {activeTab === "transfer" && (
                  <TransferWorkspace
                    materials={materials}
                    departments={departments}
                    materialId={materialId}
                    quantity={quantity}
                    departmentId={departmentId}
                    purpose={purpose}
                    remarks={remarks}
                    tracking={tracking}
                    isKeeper={isKeeper}
                    isPending={transferMutation.isPending}
                    onMaterialChange={setMaterialId}
                    onQuantityChange={setQuantity}
                    onDepartmentChange={setDepartmentId}
                    onPurposeChange={setPurpose}
                    onRemarksChange={setRemarks}
                    onTrackingChange={setTracking}
                    onSubmit={handleTransferSubmit}
                  />
                )}
              </CardBody>
            </Card>
            {(["receipt", "out"] as InventoryTabId[]).includes(activeTab) && (
              <BatchMovementQueue
                operation={activeTab === "receipt" ? "RECEIPT" : "STOCK_OUT"}
                materials={materials}
                supplierId={supplierId}
                employeeId={employeeId}
                departmentId={departmentId}
                sourceStoreId={user?.storeId || undefined}
                onSubmit={handleBatchSubmit}
                isPending={batchMutation.isPending}
              />
            )}
          </div>

          {/* Right Live Item Preview Card (1 col) */}
          <InventoryItemPreview material={selectedMaterialObj} />
        </div>
      ) : (
        <InventoryHistoryWorkspace
          transactions={transactions}
          isLoading={isLoading}
          search={historySearch}
          typeFilter={historyTypeFilter}
          onSearchChange={setHistorySearch}
          onTypeFilterChange={setHistoryTypeFilter}
          materialId={historyMaterialId}
          onMaterialIdChange={setHistoryMaterialId}
          sortBy={historySort}
          onSortChange={setHistorySort}
          asOf={asOf}
          hasNextPage={Boolean(hasNextPage)}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={() => fetchNextPage()}
        />
      )}
    </InventoryDocumentShell>
  );
}
