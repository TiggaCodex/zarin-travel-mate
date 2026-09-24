import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { TransactionForm } from "@/components/transaction-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentAccount } from "@/hooks/useAuth";
import { formatSerial } from "@/lib/format";
import { useTransaction } from "@/lib/zarin-data";

export const Route = createFileRoute("/_authenticated/transactions/$transactionId/edit")({
  head: () => ({
    meta: [
      { title: "Edit Booking | Zarin Travels & Tours" },
      { name: "description", content: "Update the details of an existing booking record." },
      { property: "og:title", content: "Edit Booking | Zarin Travels & Tours" },
      { property: "og:description", content: "Update the details of an existing booking record." },
    ],
  }),
  component: EditTransactionPage,
});

function EditTransactionPage() {
  const { transactionId } = Route.useParams();
  const { data: transaction, isLoading } = useTransaction(transactionId);
  const { isAdmin, user, loading } = useCurrentAccount();

  if (isLoading || loading) {
    return (
      <AppShell title="Edit booking">
        <Skeleton className="h-64 w-full" />
      </AppShell>
    );
  }

  if (!transaction) {
    return (
      <AppShell title="Booking not found">
        <Button asChild variant="outline">
          <Link to="/transactions">
            <ArrowLeft className="size-4" /> Back to register
          </Link>
        </Button>
      </AppShell>
    );
  }

  const canEdit =
    transaction.status === "active" && (isAdmin || transaction.created_by === user?.id);

  return (
    <AppShell
      title={`Edit booking ${formatSerial(transaction.serial_number)}`}
      description="The serial number and register date stay as they were."
    >
      {canEdit ? (
        <TransactionForm transaction={transaction} />
      ) : (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <p className="text-sm font-medium">This booking cannot be edited</p>
            <p className="text-sm text-muted-foreground">
              {transaction.status === "cancelled"
                ? "Voided bookings are kept exactly as they were for audit."
                : "Only an administrator or the staff member who recorded it can make changes."}
            </p>
            <Button asChild variant="outline">
              <Link to="/transactions/$transactionId" params={{ transactionId }}>
                <ArrowLeft className="size-4" /> Back to booking
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
