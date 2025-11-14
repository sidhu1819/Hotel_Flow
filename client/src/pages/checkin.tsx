import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { UserCheck, UserX, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BookingWithDetails } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function CheckIn() {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const { data: reservedBookings, isLoading: reservedLoading } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/bookings/reserved"],
  });

  const { data: checkedInBookings, isLoading: checkedInLoading } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/bookings/checked-in"],
  });

  const checkInMutation = useMutation({
    mutationFn: (bookingId: string) => apiRequest("POST", `/api/bookings/${bookingId}/checkin`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Guest checked in successfully" });
    },
    onError: () => {
      toast({ title: "Failed to check in guest", variant: "destructive" });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: (bookingId: string) => apiRequest("POST", `/api/bookings/${bookingId}/checkout`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Guest checked out successfully" });
    },
    onError: () => {
      toast({ title: "Failed to check out guest", variant: "destructive" });
    },
  });

  const filteredReserved = reservedBookings?.filter((booking) =>
    `${booking.guest.firstName} ${booking.guest.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    booking.room.number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCheckedIn = checkedInBookings?.filter((booking) =>
    `${booking.guest.firstName} ${booking.guest.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    booking.room.number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-5 p-5">
      <div>
        <h1 className="text-3xl font-bold">Check-In / Check-Out</h1>
        <p className="text-muted-foreground mt-1">Manage guest arrivals and departures</p>
      </div>

      <Tabs defaultValue="checkin" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="checkin" data-testid="tab-check-in">
            <UserCheck className="h-4 w-4 mr-2" />
            Check-In
          </TabsTrigger>
          <TabsTrigger value="checkout" data-testid="tab-check-out">
            <UserX className="h-4 w-4 mr-2" />
            Check-Out
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checkin" className="mt-5">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Pending Check-Ins</CardTitle>
                  <CardDescription>Guests with reserved bookings ready to check in</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search guests..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-checkin"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {reservedLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : !filteredReserved || filteredReserved.length === 0 ? (
                <div className="text-center py-12">
                  <UserCheck className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">
                    {searchQuery ? "No guests found matching your search" : "No guests waiting to check in"}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Guest</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Check-in Date</TableHead>
                      <TableHead>Nights</TableHead>
                      <TableHead>Guests</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReserved.map((booking) => {
                      const nights = Math.ceil(
                        (new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) /
                          (1000 * 60 * 60 * 24)
                      );
                      return (
                        <TableRow key={booking.id} data-testid={`checkin-row-${booking.id}`}>
                          <TableCell className="font-medium">
                            {booking.guest.firstName} {booking.guest.lastName}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{booking.room.number}</Badge>
                          </TableCell>
                          <TableCell>{format(new Date(booking.checkInDate), "MMM d, yyyy")}</TableCell>
                          <TableCell>{nights} {nights === 1 ? "night" : "nights"}</TableCell>
                          <TableCell>{booking.numberOfGuests}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => checkInMutation.mutate(booking.id)}
                              disabled={checkInMutation.isPending}
                              data-testid={`button-checkin-${booking.id}`}
                            >
                              <UserCheck className="h-4 w-4 mr-2" />
                              Check In
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checkout" className="mt-5">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Current Guests</CardTitle>
                  <CardDescription>Guests currently checked in and ready to check out</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search guests..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-checkout"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {checkedInLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : !filteredCheckedIn || filteredCheckedIn.length === 0 ? (
                <div className="text-center py-12">
                  <UserX className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">
                    {searchQuery ? "No guests found matching your search" : "No guests currently checked in"}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Guest</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Check-out Date</TableHead>
                      <TableHead>Room Rate</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCheckedIn.map((booking) => (
                      <TableRow key={booking.id} data-testid={`checkout-row-${booking.id}`}>
                        <TableCell className="font-medium">
                          {booking.guest.firstName} {booking.guest.lastName}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{booking.room.number}</Badge>
                        </TableCell>
                        <TableCell>{format(new Date(booking.checkOutDate), "MMM d, yyyy")}</TableCell>
                        <TableCell>${parseFloat(booking.room.pricePerNight).toFixed(2)}/night</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => checkOutMutation.mutate(booking.id)}
                            disabled={checkOutMutation.isPending}
                            data-testid={`button-checkout-${booking.id}`}
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            Check Out
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
