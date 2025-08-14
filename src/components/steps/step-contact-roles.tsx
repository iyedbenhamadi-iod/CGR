import type { StepProps } from "@/lib/form-types"
import { CONTACT_ROLES } from "@/lib/form-types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default function StepCompetitorContact({ formData, setFormData }: StepProps) {
  const handleRoleChange = (role: string, checked: boolean) => {
    const newRoles = formData.contactRoles || []
    if (checked) {
      setFormData({
        ...formData,
        contactRoles: [...newRoles, role]
      })
    } else {
      setFormData({
        ...formData,
        contactRoles: newRoles.filter(r => r !== role)
      })
    }
  }

  const selectAllRoles = () => {
    setFormData({
      ...formData,
      contactRoles: [...CONTACT_ROLES]
    })
  }

  const clearAllRoles = () => {
    setFormData({
      ...formData,
      contactRoles: []
    })
  }

  return (
    <div className="space-y-8">
      {/* Section Concurrent */}
      {formData.typeRecherche === "concurrent" && (
        <Card className="border-0 shadow-none bg-muted/30">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-2xl font-semibold text-foreground">
              Informations sur le concurrent
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="space-y-4">
              <div>
                <Label htmlFor="nomConcurrent" className="text-base font-medium">
                  Nom du concurrent *
                </Label>
                <Input
                  id="nomConcurrent"
                  value={formData.nomConcurrent}
                  onChange={(e) => setFormData({ ...formData, nomConcurrent: e.target.value })}
                  placeholder="Ex: Société ABC"
                  className="mt-1 h-12"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section Entreprise pour contacts */}
      {formData.typeRecherche === "contacts" && (
        <Card className="border-0 shadow-none bg-muted/30">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-2xl font-semibold text-foreground">
              Informations sur l'entreprise
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="space-y-4">
              <div>
                <Label htmlFor="nomEntreprise" className="text-base font-medium">
                  Nom de l'entreprise *
                </Label>
                <Input
                  id="nomEntreprise"
                  value={formData.nomEntreprise}
                  onChange={(e) => setFormData({ ...formData, nomEntreprise: e.target.value })}
                  placeholder="Ex: Renault, Schneider Electric"
                  className="mt-1 h-12"
                />
              </div>
              <div>
                <Label htmlFor="siteWebEntreprise" className="text-base font-medium">
                  Site web de l'entreprise
                </Label>
                <Input
                  id="siteWebEntreprise"
                  value={formData.siteWebEntreprise}
                  onChange={(e) => setFormData({ ...formData, siteWebEntreprise: e.target.value })}
                  placeholder="Ex: https://www.entreprise.com"
                  className="mt-1 h-12"
                />
              </div>
              <div>
  <Label htmlFor="zoneGeographique" className="text-base font-medium">
    Zone géographique
  </Label>
  <Input
    id="zoneGeographique"
    value={formData.location} // ✅ Changé de location à zoneGeographique
    onChange={(e) => setFormData({ ...formData, location: e.target.value })} // ✅ Changé
    placeholder="Ex: France, Paris, Lyon, Europe"
    className="mt-1 h-12"
  />
</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section Rôles des contacts - uniquement pour la recherche de contacts */}
      {formData.typeRecherche === "contacts" && (
        <>
          <Separator className="my-8" />
          <Card className="border-0 shadow-none">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-2xl font-semibold text-foreground">
                Rôles des contacts recherchés
              </CardTitle>
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={selectAllRoles}
                  className="text-sm text-primary hover:text-primary/80 underline"
                >
                  Tout sélectionner
                </button>
                <span className="text-muted-foreground">|</span>
                <button
                  type="button"
                  onClick={clearAllRoles}
                  className="text-sm text-primary hover:text-primary/80 underline"
                >
                  Tout désélectionner
                </button>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CONTACT_ROLES.map((role) => (
                  <div key={role} className="flex items-center space-x-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
                    <Checkbox
                      id={role}
                      checked={formData.contactRoles?.includes(role) || false}
                      onCheckedChange={(checked) => handleRoleChange(role, !!checked)}
                      className="h-5 w-5"
                    />
                    <Label 
                      htmlFor={role} 
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                    >
                      {role}
                    </Label>
                  </div>
                ))}
              </div>
              {formData.contactRoles && formData.contactRoles.length > 0 && (
                <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm text-muted-foreground">
                    <strong>{formData.contactRoles.length}</strong> rôle(s) sélectionné(s) : {formData.contactRoles.join(", ")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}