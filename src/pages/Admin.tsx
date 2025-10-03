import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Calendar, User, Check, Filter, Download } from "lucide-react";
import { format, isPast, parse, startOfMonth, endOfMonth, eachDayOfInterval, getDay, getDaysInMonth } from "date-fns";
import jsPDF from "jspdf";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const { data: bookings, isLoading, refetch } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("date", { ascending: true })
        .order("time_slot", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  // Auto-complete past bookings
  useEffect(() => {
    if (!bookings) return;

    const autoCompletePastBookings = async () => {
      const now = new Date();
      const pastBookings = bookings.filter((booking) => {
        if (booking.status !== "Booked") return false;
        
        const bookingDate = new Date(booking.date);
        const timeSlot = booking.time_slot;
        const endTime = timeSlot.split("-")[1]?.trim();
        
        if (!endTime) return false;
        
        // Parse end time (e.g., "4 PM" -> 16:00)
        const bookingDateTime = parse(
          `${format(bookingDate, "yyyy-MM-dd")} ${endTime}`,
          "yyyy-MM-dd h a",
          new Date()
        );
        
        return isPast(bookingDateTime);
      });

      if (pastBookings.length > 0) {
        for (const booking of pastBookings) {
          await supabase
            .from("bookings")
            .update({ status: "Completed" })
            .eq("id", booking.id);
        }
        
        refetch();
        
        toast({
          title: "Auto-completed",
          description: `${pastBookings.length} past booking(s) marked as completed`,
        });
      }
    };

    autoCompletePastBookings();
  }, [bookings, refetch, toast]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: `Booking status changed to ${newStatus}`,
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      Booked: "default",
      Completed: "default",
      Canceled: "destructive",
      Deleted: "secondary",
    };

    const colors: Record<string, string> = {
      Booked: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
      Completed: "bg-green-500/10 text-green-700 dark:text-green-400",
      Canceled: "bg-red-500/10 text-red-700 dark:text-red-400",
      Deleted: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
    };

    return (
      <Badge variant={variants[status] || "default"} className={colors[status]}>
        {status}
      </Badge>
    );
  };

  // Filter and search bookings
  const filteredBookings = useMemo(() => {
    if (!bookings) return [];

    return bookings.filter((booking) => {
      const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
      const matchesSearch = 
        booking.facebook_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (booking.note && booking.note.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchesStatus && matchesSearch;
    });
  }, [bookings, statusFilter, searchQuery]);

  const generateCalendarPDF = async () => {
    if (!bookings) return;

    const [year, month] = selectedMonth.split("-").map(Number);
    const monthDate = new Date(year, month - 1, 1);
    const monthName = format(monthDate, "MMMM");
    
    // Filter bookings for selected month
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const monthBookings = bookings.filter((booking) => {
      const bookingDate = new Date(booking.date);
      return bookingDate >= monthStart && bookingDate <= monthEnd && 
             (booking.status === "Booked" || booking.status === "Completed");
    });

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    // Vertical month name on the left (purple gradient style)
    pdf.setFontSize(50);
    pdf.setTextColor(147, 112, 219); // Purple color
    pdf.setFont("helvetica", "bold");
    pdf.text(monthName.toUpperCase(), 12, 200, { angle: 90 });
    
    pdf.setFontSize(20);
    pdf.text(year.toString(), 12, 70, { angle: 90 });

    // Calendar grid settings
    const startX = 35;
    const startY = 25;
    const cellWidth = 38;
    const cellHeight = 38;
    const timeSlots = ["2-4 PM", "4-6 PM", "6-8 PM", "8-10 PM"];

    // Draw header row with days including Sunday
    const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    pdf.setFontSize(11);
    pdf.setTextColor(80, 80, 80);
    pdf.setFont("helvetica", "bold");
    
    days.forEach((day, index) => {
      pdf.text(day, startX + index * cellWidth + cellWidth / 2, startY - 8, { align: "center" });
    });

    // Get all days in the month
    const daysInMonth = getDaysInMonth(monthDate);
    const firstDayOfMonth = getDay(new Date(year, month - 1, 1)); // 0 = Sunday, 1 = Monday, etc.

    let currentRow = 0;
    let dayNumber = 1;
    
    // Calculate how many rows we need
    const totalCells = firstDayOfMonth + daysInMonth;
    const numRows = Math.ceil(totalCells / 7);

    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < 7; col++) {
        const x = startX + col * cellWidth;
        const y = startY + row * cellHeight;

        // Draw cell border
        pdf.setDrawColor(180, 180, 180);
        pdf.setLineWidth(0.2);
        pdf.rect(x, y, cellWidth, cellHeight);

        // Check if this cell should have a day number
        if ((row === 0 && col >= firstDayOfMonth && dayNumber <= daysInMonth) ||
            (row > 0 && dayNumber <= daysInMonth)) {
          
          const currentDate = new Date(year, month - 1, dayNumber);
          const dayOfWeek = getDay(currentDate);

          if (dayOfWeek === 0) {
            // Sunday - show "Dayoff"
            pdf.setFontSize(12);
            pdf.setTextColor(0, 0, 0);
            pdf.setFont("helvetica", "bold");
            pdf.text("Dayoff", x + cellWidth / 2, y + cellHeight / 2, { 
              align: "center",
              baseline: "middle"
            });
          } else {
            // Regular day - show date number and time slots
            pdf.setFontSize(10);
            pdf.setTextColor(120, 120, 120);
            pdf.setFont("helvetica", "normal");
            pdf.text(dayNumber.toString(), x + 3, y + 6);

            // Draw time slots
            pdf.setFontSize(7);
            const dateStr = format(currentDate, "yyyy-MM-dd");
            
            timeSlots.forEach((slot, slotIndex) => {
              const slotY = y + 14 + slotIndex * 6;
              const isBooked = monthBookings.some(
                (b) => format(new Date(b.date), "yyyy-MM-dd") === dateStr && b.time_slot === slot
              );

              pdf.setTextColor(0, 0, 0);
              pdf.setFont("helvetica", "normal");
              pdf.text(slot, x + cellWidth / 2, slotY, { align: "center" });
              
              // Add strikethrough if booked
              if (isBooked) {
                const textWidth = pdf.getTextWidth(slot);
                pdf.setDrawColor(0, 0, 0);
                pdf.setLineWidth(0.4);
                pdf.line(
                  x + cellWidth / 2 - textWidth / 2 - 1,
                  slotY - 1.2,
                  x + cellWidth / 2 + textWidth / 2 + 1,
                  slotY - 1.2
                );
              }
            });
          }
          
          dayNumber++;
        }
      }
    }

    pdf.save(`calendar-${monthName}-${year}.pdf`);
    
    toast({
      title: "PDF Downloaded",
      description: `Calendar for ${monthName} ${year} has been downloaded`,
    });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-2 flex items-center gap-2">
              <User className="h-4 w-4" />
              {user.email}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex items-center gap-2">
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-[180px]"
              />
              <Button
                onClick={generateCalendarPDF}
                variant="default"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Bookings Table */}
        <Card className="shadow-elegant overflow-hidden">
          <div className="p-6 border-b bg-card/50 space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-semibold">Nail Bookings</h2>
            </div>
            
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Booked">Booked</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Canceled">Canceled</SelectItem>
                    <SelectItem value="Deleted">Deleted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Input
                placeholder="Search by name, address, or note..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground">
              Loading bookings...
            </div>
          ) : !filteredBookings || filteredBookings.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              {searchQuery || statusFilter !== "all" 
                ? "No bookings match your filters" 
                : "No bookings yet"}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time Slot</TableHead>
                      <TableHead>Facebook Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {format(new Date(booking.date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{booking.time_slot}</TableCell>
                        <TableCell>{booking.facebook_name}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {booking.address}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {booking.note || "—"}
                        </TableCell>
                        <TableCell>{getStatusBadge(booking.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2 flex-wrap">
                            {booking.status === "Booked" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1"
                                  onClick={() => handleStatusChange(booking.id, "Completed")}
                                >
                                  <Check className="h-3 w-3" />
                                  Complete
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStatusChange(booking.id, "Canceled")}
                                >
                                  Cancel
                                </Button>
                              </>
                            )}
                            {booking.status !== "Deleted" && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleStatusChange(booking.id, "Deleted")}
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden p-4 space-y-4">
                {filteredBookings.map((booking) => (
                  <Card key={booking.id} className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="font-semibold">
                          {format(new Date(booking.date), "MMM dd, yyyy")}
                        </p>
                        <p className="text-sm text-muted-foreground">{booking.time_slot}</p>
                      </div>
                      {getStatusBadge(booking.status)}
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Name: </span>
                        {booking.facebook_name}
                      </div>
                      <div>
                        <span className="font-medium">Address: </span>
                        {booking.address}
                      </div>
                      {booking.note && (
                        <div>
                          <span className="font-medium">Note: </span>
                          {booking.note}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 flex-wrap pt-2 border-t">
                      {booking.status === "Booked" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 flex-1"
                            onClick={() => handleStatusChange(booking.id, "Completed")}
                          >
                            <Check className="h-3 w-3" />
                            Complete
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleStatusChange(booking.id, "Canceled")}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                      {booking.status !== "Deleted" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          onClick={() => handleStatusChange(booking.id, "Deleted")}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Admin;
