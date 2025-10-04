import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BookingDatePickerProps {
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
}

export const BookingDatePicker = ({ date, onDateChange }: BookingDatePickerProps) => {
  const [fullyBookedDates, setFullyBookedDates] = useState<Date[]>([]);

  const isSunday = (date: Date) => date.getDay() === 0;

  useEffect(() => {
    const fetchFullyBookedDates = async () => {
      const { data, error } = await supabase.rpc("get_fully_booked_dates");
      console.log(data);
      if (error) {
        console.error("Error fetching fully booked dates:", error);
        return;
      }

      const parsed = data.map((d) => new Date(d.booked_date));
      setFullyBookedDates(parsed);
    };

    fetchFullyBookedDates();
  }, []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-12 bg-card hover:bg-secondary/50 transition-all",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-5 w-5" />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-card z-50" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateChange}
          disabled={(currentDate) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const isPast = currentDate < today;
            const isBooked = fullyBookedDates.some(
              (d) => d.toDateString() === currentDate.toDateString()
            );

            return isPast || isSunday(currentDate) || isBooked;
          }}
          initialFocus
          className="pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
};
