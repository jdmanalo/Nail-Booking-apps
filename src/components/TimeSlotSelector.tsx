import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface TimeSlotSelectorProps {
  selectedDate: Date | undefined;
  selectedSlot: string | null;
  onSlotChange: (slot: string) => void;
}

const TIME_SLOTS = ["2-4 PM", "4-6 PM", "6-8 PM", "8-10 PM"];

export const TimeSlotSelector = ({
  selectedDate,
  selectedSlot,
  onSlotChange,
}: TimeSlotSelectorProps) => {
  const { data: availability, isLoading } = useQuery({
    queryKey: ["slot-availability", selectedDate],
    queryFn: async () => {
      if (!selectedDate) return {};
      
      const formattedDate = format(selectedDate, "yyyy-MM-dd");
      const results: Record<string, boolean> = {};
      
      // Check availability for each time slot
      for (const slot of TIME_SLOTS) {
        const { data, error } = await supabase.rpc("is_time_slot_available", {
          check_date: formattedDate,
          check_time_slot: slot,
        });
        
        if (error) {
          console.error(`Error checking availability for ${slot}:`, error);
          results[slot] = true; // Assume available on error
        } else {
          results[slot] = data === true;
        }
      }
      
      return results;
    },
    enabled: !!selectedDate,
  });

  const isSlotAvailable = (slot: string) => {
    if (!availability) return true;
    return availability[slot] !== false;
  };

  if (!selectedDate) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Please select a date first
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
      {TIME_SLOTS.map((slot) => {
        const available = isSlotAvailable(slot);
        const isSelected = selectedSlot === slot;

        return (
          <Button
            key={slot}
            variant={isSelected ? "default" : "outline"}
            disabled={!available || isLoading}
            onClick={() => onSlotChange(slot)}
            className={cn(
              "h-16 text-base font-medium transition-all duration-300",
              !available && "opacity-50 cursor-not-allowed",
              isSelected && "bg-gradient-primary shadow-elegant scale-105",
              available && !isSelected && "hover:scale-105 hover:shadow-soft"
            )}
          >
            <Clock className="mr-2 h-5 w-5" />
            <div className="flex flex-col items-start">
              <span>{slot}</span>
              {!available && (
                <span className="text-xs opacity-80">Unavailable</span>
              )}
            </div>
          </Button>
        );
      })}
    </div>
  );
};
