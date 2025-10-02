import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface BookingDatePickerProps {
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
}

export const BookingDatePicker = ({ date, onDateChange }: BookingDatePickerProps) => {
  const isSunday = (date: Date) => {
    return date.getDay() === 0;
  };

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
          disabled={(date) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return date < today || isSunday(date);
          }}
          initialFocus
          className="pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
};
