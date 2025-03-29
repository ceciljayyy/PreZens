import { Slider } from "@/components/ui/slider";

interface RadiusSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export default function RadiusSlider({
  value,
  onValueChange,
  min = 10,
  max = 500,
  step = 10,
}: RadiusSliderProps) {
  const handleChange = (value: number[]) => {
    onValueChange(value[0]);
  };
  
  return (
    <div className="w-full">
      <Slider
        defaultValue={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={handleChange}
      />
      <div className="flex justify-between mt-1 text-xs text-muted-foreground">
        <span>{min}m</span>
        <span>{max}m</span>
      </div>
    </div>
  );
}
