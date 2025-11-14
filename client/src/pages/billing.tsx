import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Receipt, Plus, Printer, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { BookingWithDetails, BillWithDetails } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const billItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.string().min(1, "Amount is required"),
  category: z.string().min(1, "Category is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
});

type BillItemForm = z.infer<typeof billItemSchema>;

export default function Billing() {
  const [selectedBookingId, setSelectedBookingId] = useState<string>("");
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: checkedOutBookings, isLoading: bookingsLoading } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/bookings/checked-out"],
  });

  const { data: bill, isLoading: billLoading } = useQuery<BillWithDetails>({
    queryKey: ["/api/bills", selectedBookingId],
    enabled: !!selectedBookingId,
  });

  const form = useForm<BillItemForm>({
    resolver: zodResolver(billItemSchema),
    defaultValues: {
      description: "",
      amount: "0",
      category: "service",
      quantity: 1,
    },
  });

  const generateBillMutation = useMutation({
    mutationFn: (bookingId: string) => apiRequest("POST", "/api/bills/generate", { bookingId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills", selectedBookingId] });
      toast({ title: "Bill generated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to generate bill", variant: "destructive" });
    },
  });

  const addBillItemMutation = useMutation({
    mutationFn: (data: BillItemForm & { bookingId: string }) =>
      apiRequest("POST", "/api/bills/add-item", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills", selectedBookingId] });
      toast({ title: "Item added to bill" });
      setAddItemDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to add item", variant: "destructive" });
    },
  });

  const selectedBooking = checkedOutBookings?.find((b) => b.id === selectedBookingId);

  const handlePrint = () => {
    window.print();
    toast({ title: "Printing bill..." });
  };

  return (
    <div className="flex flex-col gap-5 p-5">
      <div>
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="text-muted-foreground mt-1">Generate and manage guest bills</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Select Booking</CardTitle>
            <CardDescription>Choose a checked-out booking to view or generate bill</CardDescription>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={selectedBookingId} onValueChange={setSelectedBookingId}>
                <SelectTrigger data-testid="select-booking">
                  <SelectValue placeholder="Select a booking" />
                </SelectTrigger>
                <SelectContent>
                  {checkedOutBookings?.map((booking) => (
                    <SelectItem key={booking.id} value={booking.id}>
                      {booking.guest.firstName} {booking.guest.lastName} - Room {booking.room.number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedBooking && (
              <div className="mt-4 p-3 rounded-md bg-muted space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Guest:</span>
                  <span className="font-medium">
                    {selectedBooking.guest.firstName} {selectedBooking.guest.lastName}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Room:</span>
                  <span className="font-medium">{selectedBooking.room.number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Dates:</span>
                  <span className="font-medium">
                    {format(new Date(selectedBooking.checkInDate), "MMM d")} -{" "}
                    {format(new Date(selectedBooking.checkOutDate), "MMM d")}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
          {selectedBookingId && !bill && (
            <CardFooter>
              <Button
                className="w-full"
                onClick={() => generateBillMutation.mutate(selectedBookingId)}
                disabled={generateBillMutation.isPending}
                data-testid="button-generate-bill"
              >
                <Receipt className="h-4 w-4 mr-2" />
                {generateBillMutation.isPending ? "Generating..." : "Generate Bill"}
              </Button>
            </CardFooter>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Bill Details</CardTitle>
                <CardDescription>Itemized charges and total amount</CardDescription>
              </div>
              {bill && (
                <div className="flex gap-2">
                  <Dialog open={addItemDialogOpen} onOpenChange={setAddItemDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" data-testid="button-add-item">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Bill Item</DialogTitle>
                        <DialogDescription>Add additional charges to the bill</DialogDescription>
                      </DialogHeader>
                      <Form {...form}>
                        <form
                          onSubmit={form.handleSubmit((data) =>
                            addBillItemMutation.mutate({ ...data, bookingId: selectedBookingId })
                          )}
                          className="space-y-4"
                        >
                          <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Input placeholder="Room service, minibar, etc." {...field} data-testid="input-description" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Category</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-category">
                                      <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="service">Service</SelectItem>
                                    <SelectItem value="food">Food & Beverage</SelectItem>
                                    <SelectItem value="amenity">Amenity</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <FormField
                              control={form.control}
                              name="amount"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Amount ($)</FormLabel>
                                  <FormControl>
                                    <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} data-testid="input-amount" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="quantity"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Quantity</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="1"
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                                      data-testid="input-quantity"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setAddItemDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button type="submit" disabled={addBillItemMutation.isPending} data-testid="button-submit-item">
                              {addBillItemMutation.isPending ? "Adding..." : "Add Item"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                  <Button variant="outline" size="sm" onClick={handlePrint} data-testid="button-print">
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedBookingId ? (
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Select a booking to view or generate bill</p>
              </div>
            ) : billLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !bill ? (
              <div className="text-center py-12">
                <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No bill generated yet</p>
                <p className="text-sm text-muted-foreground mt-1">Click "Generate Bill" to create one</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-3">Room Charges</h3>
                  <div className="space-y-2">
                    {bill.items
                      .filter((item) => item.category === "room")
                      .map((item) => (
                        <div key={item.id} className="flex justify-between text-sm p-2 rounded-md bg-muted">
                          <span>{item.description}</span>
                          <span className="font-medium" data-testid={`item-${item.id}-amount`}>
                            ${parseFloat(item.amount).toFixed(2)} × {item.quantity}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {bill.items.some((item) => item.category !== "room" && item.category !== "tax") && (
                  <div>
                    <h3 className="font-semibold mb-3">Additional Services</h3>
                    <div className="space-y-2">
                      {bill.items
                        .filter((item) => item.category !== "room" && item.category !== "tax")
                        .map((item) => (
                          <div key={item.id} className="flex justify-between text-sm p-2 rounded-md bg-muted">
                            <div className="flex items-center gap-2">
                              <span>{item.description}</span>
                              <Badge variant="outline" className="text-xs capitalize">
                                {item.category}
                              </Badge>
                            </div>
                            <span className="font-medium">
                              ${parseFloat(item.amount).toFixed(2)} × {item.quantity}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium" data-testid="subtotal">${parseFloat(bill.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax ({parseFloat(bill.taxRate).toFixed(0)}%):</span>
                    <span className="font-medium" data-testid="tax">${parseFloat(bill.taxAmount).toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg">
                    <span className="font-semibold">Total:</span>
                    <span className="font-bold text-primary" data-testid="total">
                      ${parseFloat(bill.total).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-md bg-success/10 border border-success/20">
                  <span className="text-sm font-medium text-success">Payment Status:</span>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                    {bill.isPaid ? "Paid" : "Pending"}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
