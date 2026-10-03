import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { ClientPicker } from "@/components/client-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatNaira, scopeLabel, todayISO, TRAVEL_CLASSES } from "@/lib/format";
import {
  useAirlines,
  useCreateTransaction,
  useUpdateTransaction,
  type TransactionInput,
  type TransactionRow,
} from "@/lib/zarin-data";

type FormErrors = Partial<
  Record<
    | "client_id"
    | "airline_id"
    | "register_date"
    | "departure_date"
    | "return_date"
    | "client_fare"
    | "payable",
    string
  >
>;

function toAmount(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  return digits === "" ? null : Number(digits);
}

export function TransactionForm({ transaction }: { transaction?: TransactionRow }) {
  const navigate = useNavigate();
  const { data: airlines, isLoading: airlinesLoading } = useAirlines();
  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const saving = create.isPending || update.isPending;

  const [clientId, setClientId] = useState(transaction?.client_id ?? "");
  const [airlineId, setAirlineId] = useState(transaction?.airline_id ?? "");
  const [travelClass, setTravelClass] = useState<TransactionInput["travel_class"]>(
    transaction?.travel_class ?? "economy",
  );
  const [entryDate, setEntryDate] = useState(transaction?.register_date ?? todayISO());
  const [departureDate, setDepartureDate] = useState(transaction?.departure_date ?? "");
  const [returnDate, setReturnDate] = useState(transaction?.return_date ?? "");
  const [pnr, setPnr] = useState(transaction?.pnr ?? "");
  const [pickup, setPickup] = useState(transaction?.pickup_dropoff ?? "");
  const [remark, setRemark] = useState(transaction?.remark ?? "");
  const [clientFare, setClientFare] = useState(
    transaction ? String(transaction.client_fare) : "",
  );
  const [payable, setPayable] = useState(transaction ? String(transaction.payable) : "");
  const [errors, setErrors] = useState<FormErrors>({});

  const selectableAirlines = (airlines ?? []).filter(
    (airline) => airline.is_active || airline.id === transaction?.airline_id,
  );
  const selectedAirline = (airlines ?? []).find((airline) => airline.id === airlineId) ?? null;

  const fareValue = toAmount(clientFare);
  const payableValue = toAmount(payable);
  const commission =
    fareValue !== null && payableValue !== null && fareValue >= payableValue
      ? fareValue - payableValue
      : null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const nextErrors: FormErrors = {};
    if (!clientId) nextErrors.client_id = "Select a client or add a new one.";
    if (!entryDate) nextErrors.register_date = "Enter the entry date.";
    else if (entryDate > todayISO()) nextErrors.register_date = "The entry date cannot be in the future.";
    if (!airlineId) nextErrors.airline_id = "Select an airline.";
    if (!departureDate) nextErrors.departure_date = "Enter the departure date.";
    if (returnDate && departureDate && returnDate < departureDate) {
      nextErrors.return_date = "The return date cannot be before the departure date.";
    }
    if (fareValue === null) nextErrors.client_fare = "Enter the client fare.";
    if (payableValue === null) nextErrors.payable = "Enter the payable amount.";
    if (fareValue !== null && payableValue !== null && fareValue < payableValue) {
      nextErrors.client_fare = "The client fare cannot be less than the payable amount.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload: TransactionInput = {
      client_id: clientId,
      airline_id: airlineId,
      travel_class: travelClass,
      register_date: entryDate,
      departure_date: departureDate,
      return_date: returnDate || null,
      client_fare: fareValue!,
      payable: payableValue!,
      pnr: pnr.trim() || null,
      pickup_dropoff: pickup.trim() || null,
      remark: remark.trim() || null,
    };

    try {
      if (transaction) {
        await update.mutateAsync({ id: transaction.id, ...payload });
        toast.success("Booking updated");
        navigate({ to: "/transactions/$transactionId", params: { transactionId: transaction.id } });
      } else {
        const created = await create.mutateAsync(payload);
        toast.success("Booking saved");
        navigate({ to: "/transactions/$transactionId", params: { transactionId: created.id } });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the booking.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Client</CardTitle>
          <CardDescription>Pick an existing client or add a new one here.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <ClientPicker value={clientId} onChange={setClientId} />
          {errors.client_id ? <p className="text-sm text-destructive">{errors.client_id}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Travel</CardTitle>
          <CardDescription>
            Local or international is taken from the airline you choose.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Airline</Label>
            <Select value={airlineId} onValueChange={setAirlineId} disabled={airlinesLoading}>
              <SelectTrigger>
                <SelectValue placeholder={airlinesLoading ? "Loading…" : "Select an airline"} />
              </SelectTrigger>
              <SelectContent>
                {selectableAirlines.map((airline) => (
                  <SelectItem key={airline.id} value={airline.id}>
                    {airline.name} · {scopeLabel(airline.scope)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.airline_id ? (
              <p className="text-sm text-destructive">{errors.airline_id}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {selectedAirline
                ? `${scopeLabel(selectedAirline.scope)} airline`
                : "Classification appears once an airline is selected."}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Class</Label>
            <Select
              value={travelClass}
              onValueChange={(value) => setTravelClass(value as TransactionInput["travel_class"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRAVEL_CLASSES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="entry-date">Entry date</Label>
            <Input
              id="entry-date"
              type="date"
              max={todayISO()}
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="sm:max-w-xs"
            />
            {errors.register_date ? (
              <p className="text-sm text-destructive">{errors.register_date}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                The date this booking belongs to. Earlier dates are allowed; future dates are not.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="departure">Departure date</Label>
            <Input
              id="departure"
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
            />
            {errors.departure_date ? (
              <p className="text-sm text-destructive">{errors.departure_date}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="return">Return date (optional)</Label>
            <Input
              id="return"
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
            />
            {errors.return_date ? (
              <p className="text-sm text-destructive">{errors.return_date}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pnr">PNR (optional)</Label>
            <Input
              id="pnr"
              value={pnr}
              onChange={(e) => setPnr(e.target.value.toUpperCase())}
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pickup">Pickup / drop-off (optional)</Label>
            <Input
              id="pickup"
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
              autoComplete="off"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Financial</CardTitle>
          <CardDescription>Amounts are in whole naira.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="fare">Client fare</Label>
            <Input
              id="fare"
              inputMode="numeric"
              value={clientFare}
              onChange={(e) => setClientFare(e.target.value.replace(/[^\d]/g, ""))}
            />
            {errors.client_fare ? (
              <p className="text-sm text-destructive">{errors.client_fare}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="payable">Payable</Label>
            <Input
              id="payable"
              inputMode="numeric"
              value={payable}
              onChange={(e) => setPayable(e.target.value.replace(/[^\d]/g, ""))}
            />
            {errors.payable ? <p className="text-sm text-destructive">{errors.payable}</p> : null}
          </div>

          <div className="space-y-2">
            <Label>Potential commission</Label>
            <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm font-medium">
              {commission === null ? "—" : formatNaira(commission)}
            </div>
            <p className="text-xs text-muted-foreground">Client fare minus payable.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Other</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="remark">Remark (optional)</Label>
          <Textarea
            id="remark"
            rows={3}
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : transaction ? "Save changes" : "Save booking"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            transaction
              ? navigate({
                  to: "/transactions/$transactionId",
                  params: { transactionId: transaction.id },
                })
              : navigate({ to: "/transactions" })
          }
        >
          Cancel
        </Button>
        {!transaction ? (
          <p className="w-full text-xs text-muted-foreground">
            Serial number and register date are generated automatically when you save.
          </p>
        ) : null}
      </div>
    </form>
  );
}
