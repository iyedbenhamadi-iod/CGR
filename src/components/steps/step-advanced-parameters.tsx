"use client"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { StepProps } from "@/lib/form-types"

export default function StepAdvancedParameters({ formData, setFormData }: StepProps) {
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-foreground">Ajustez les paramètres avancés</h2>
      <p className="text-lg text-muted-foreground">
        Ces options vous permettent de contrôler la granularité et le volume des résultats.
      </p>

      <div className="space-y-4">
        <Label htmlFor="nombreResultats" className="text-lg font-medium text-foreground">
          Nombre de résultats souhaités
        </Label>
        <Select
          value={formData.nombreResultats.toString()}
          onValueChange={(value) => setFormData((prev) => ({ ...prev, nombreResultats: Number.parseInt(value) }))}
        >
          <SelectTrigger className="w-full h-12 text-base border-border focus:border-primary focus:ring-primary">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5 entreprises</SelectItem>
            <SelectItem value="10">10 entreprises</SelectItem>
            <SelectItem value="20">20 entreprises</SelectItem>
            <SelectItem value="50">50 entreprises</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
