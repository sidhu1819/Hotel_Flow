import { useQuery } from "@tanstack/react-query";
import { BedDouble, Users, CalendarCheck, TrendingUp, Plus } from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { Button } from "@/components/ui/button";
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
import { Link } from "wouter";
import type { BookingWithDetails } from "@shared/schema";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentBookings, isLoading: bookingsLoading } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/bookings/recent"],
  });

  const { data: todayCheckIns, isLoading: checkInsLoading } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/dashboard/today-checkins"],
  });

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here's your hotel overview.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/bookings">
            <Button variant="secondary" data-testid="button-new-booking">
              <Plus className="h-4 w-4 mr-2" />
              New Booking
            </Button>
          </Link>
          <Link href="/checkin">
            <Button data-testid="button-check-in">
              <CalendarCheck className="h-4 w-4 mr-2" />
              Check In
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <MetricCard
              title="Total Rooms"
              value={stats?.totalRooms || 0}
              description="Across all floors"
              icon={BedDouble}
              iconColor="text-primary"
            />
            <MetricCard
              title="Available Rooms"
              value={stats?.availableRooms || 0}
              description={`${stats?.occupancyRate || 0}% occupancy`}
              icon={BedDouble}
              iconColor="text-success"
            />
            <MetricCard
              title="Total Guests"
              value={stats?.totalGuests || 0}
              description="Registered guests"
              icon={Users}
              iconColor="text-accent"
            />
            <MetricCard
              title="Active Bookings"
              value={stats?.activeBookings || 0}
              description="Current reservations"
              icon={CalendarCheck}
              iconColor="text-secondary"
            />
          </>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today's Check-Ins</CardTitle>
            <CardDescription>Guests arriving today</CardDescription>
          </CardHeader>
          <CardContent>
            {checkInsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !todayCheckIns || todayCheckIns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No check-ins scheduled for today
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guest</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayCheckIns.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">
                        {booking.guest.firstName} {booking.guest.lastName}
                      </TableCell>
                      <TableCell>{booking.room.number}</TableCell>
                      <TableCell>
                        <StatusBadge status={booking.status as any} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
            <CardDescription>Latest reservation activity</CardDescription>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !recentBookings || recentBookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No recent bookings
              </div>
            ) : (
              <div className="space-y-3">
                {recentBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-3 rounded-md border hover-elevate"
                    data-testid={`booking-${booking.id}`}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {booking.guest.firstName} {booking.guest.lastName}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Room {booking.room.number} • {format(new Date(booking.checkInDate), "MMM d")} - {format(new Date(booking.checkOutDate), "MMM d")}
                      </span>
                    </div>
                    <StatusBadge status={booking.status as any} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
