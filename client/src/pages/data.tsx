import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Archive } from "lucide-react";
import type { ArchivedBill } from "@shared/schema";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function Data() {
  const { data: archives, isLoading } = useQuery<ArchivedBill[]>({
    queryKey: ["/api/archive"],
  });

  return (
    <div className="flex flex-col gap-5 p-5">
      <div>
        <h1 className="text-3xl font-bold">Bill Archive</h1>
        <p className="text-muted-foreground mt-1">History of all completed and archived bills</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Completed Bills</CardTitle>
          <CardDescription>
            {archives ? `${archives.length} records found` : "Loading records..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !archives || archives.length === 0 ? (
            <div className="text-center py-12">
              <Archive className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                No archived bills found.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Check-In</TableHead>
                  <TableHead>Check-Out</TableHead>
                  <TableHead>Completed On</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archives.map((archive) => (
                  <TableRow key={archive.id} data-testid={`archive-row-${archive.id}`}>
                    <TableCell className="font-medium">
                      {archive.guestName}
                      <p className="text-xs text-muted-foreground">{archive.phone}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {archive.roomNumber} ({archive.roomType})
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(archive.checkInDate), "MMM d, yyyy")}</TableCell>
                    <TableCell>{format(new Date(archive.checkOutDate), "MMM d, yyyy")}</TableCell>
                    <TableCell>{format(new Date(archive.completedAt), "MMM d, yyyy, p")}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${parseFloat(archive.total).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}