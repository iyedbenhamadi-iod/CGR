"use client"
import React from "react"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { type StepProps, PRODUITS_CGR, CLIENTS_EXISTANTS } from "@/lib/form-types"

export default function StepCGRContext({ formData, setFormData }: StepProps) {
  const handleArrayChange = (field: string, value: string, checked: boolean) =>
    setFormData((prev) => ({
      ...prev,
      [field]: checked
        ? [...(prev[field as keyof typeof prev] as string[]), value]
        : (prev[field as keyof typeof prev] as string[]).filter((item) => item !== value),
    }))

  const handleAutresProduits = (checked: boolean) => {
    if (!checked) {
      // If unchecking, remove custom products and clear the text
      setFormData((prev) => ({
        ...prev,
        autresProduits: "",
        produitsCGR: prev.produitsCGR.filter(item => PRODUITS_CGR.includes(item)),
        showAutresProduits: false
      }))
    } else {
      // If checking, show the input field
      setFormData((prev) => ({
        ...prev,
        showAutresProduits: true
      }))
    }
  }

  const handleAutresProduitsInput = (value: string) => {
    setFormData((prev) => {
      // Get only standard products (remove all custom ones)
      const standardProduits = prev.produitsCGR.filter(item => PRODUITS_CGR.includes(item))
      
      // Parse the new custom products (comma or line separated)
      const customProduits = value
        .split(/[,\n]/)
        .map(p => p.trim())
        .filter(p => p !== '')
      
      return {
        ...prev,
        autresProduits: value,
        produitsCGR: [...standardProduits, ...customProduits]
      }
    })
  }

  // Initialize clientsExclure with static clients if not already done
  React.useEffect(() => {
    if (!formData.clientsExclure || formData.clientsExclure.trim() === '') {
      setFormData((prev) => ({
        ...prev,
        clientsExclure: CLIENTS_EXISTANTS.join('\n')
      }))
    }
  }, [formData.clientsExclure, setFormData])

  const handleClientsExclureChange = (value: string) => {
    // Parse user input into array (split by lines, filter empty)
    const additionalClients = value
      .split('\n')
      .map(client => client.trim())
      .filter(client => client !== '')

    // Combine static clients with additional ones and convert back to string
    const allClientsToExclude = [...CLIENTS_EXISTANTS, ...additionalClients].join('\n')

    setFormData((prev) => ({
      ...prev,
      clientsExclure: allClientsToExclude
    }))
  }

  // Check if "Autres" should be shown - detect custom products or explicit flag
  const customProducts = formData.produitsCGR.filter(p => !PRODUITS_CGR.includes(p))
  const isAutresChecked = formData.showAutresProduits === true || customProducts.length > 0

  // Get the additional clients (those not in CLIENTS_EXISTANTS)
  const getAdditionalClients = () => {
    if (!formData.clientsExclure) return '';
    
    return formData.clientsExclure
      .split('\n')
      .filter(client => client.trim() !== '' && !CLIENTS_EXISTANTS.includes(client.trim()))
      .join('\n');
  }

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-foreground">Précisez le contexte CGR International</h2>
      <p className="text-lg text-muted-foreground">
        Ces informations nous aideront à aligner la recherche avec les capacités et les objectifs de CGR.
      </p>

      {/* Produits CGR */}
      <div className="space-y-4">
        <Label className="text-lg font-medium text-foreground">Produits CGR à proposer</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {PRODUITS_CGR.map((produit) => (
            <div key={produit} className="flex items-center space-x-3">
              <Checkbox
                id={produit}
                checked={formData.produitsCGR.includes(produit)}
                onCheckedChange={(checked) => handleArrayChange("produitsCGR", produit, checked as boolean)}
              />
              <Label htmlFor={produit} className="text-base text-muted-foreground cursor-pointer">
                {produit}
              </Label>
            </div>
          ))}
          
          {/* Champ libre pour autres produits */}
          <div className="col-span-full space-y-3 pt-4 border-t border-border">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="autres-produits"
                checked={isAutresChecked}
                onCheckedChange={(checked) => handleAutresProduits(checked as boolean)}
              />
              <Label htmlFor="autres-produits" className="text-base text-muted-foreground cursor-pointer">
                Autres produits (préciser)
              </Label>
            </div>
            
            {isAutresChecked && (
              <div className="ml-6 space-y-2">
                <Input
                  id="champ-libre-produits"
                  value={formData.autresProduits || customProducts.join(', ')}
                  onChange={(e) => handleAutresProduitsInput(e.target.value)}
                  placeholder="Spécifiez les autres produits souhaités (séparés par des virgules)..."
                  className="text-base border-border focus:border-primary focus:ring-primary"
                />
                {customProducts.length > 0 && !formData.autresProduits && (
                  <div className="flex flex-wrap gap-2">
                    <p className="text-xs text-muted-foreground">Produits personnalisés détectés:</p>
                    {customProducts.map((product, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {product}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Clients à exclure */}
      <div className="space-y-4">
        <Label htmlFor="clientsExclure" className="text-lg font-medium text-foreground">
          Clients existants à exclure
        </Label>
        <div className="space-y-3">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Clients existants (automatiquement exclus) :</p>
            <div className="flex flex-wrap gap-3">
              {CLIENTS_EXISTANTS.map((client) => (
                <Badge
                  key={client}
                  variant="secondary"
                  className="text-base px-4 py-1.5 rounded-full font-normal bg-primary/10 text-primary"
                >
                  {client}
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Clients supplémentaires à exclure :</p>
            <Textarea
              id="clientsExclure"
              value={getAdditionalClients()}
              onChange={(e) => handleClientsExclureChange(e.target.value)}
              placeholder="Ajouter d'autres clients à exclure (un par ligne)..."
              rows={2}
              className="min-h-[70px] text-base border-border focus:border-primary focus:ring-primary"
            />
          </div>
        </div>
      </div>
    </div>
  )
}