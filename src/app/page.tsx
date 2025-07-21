import Link from "next/link"
import { ArrowRight, Zap, Target, BarChart3 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 lg:py-32">
        {/* Header */}
        <div className="text-center mb-16 md:mb-24">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">🎯 Prospection IA</h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Trouvez des prospects qualifiés automatiquement avec l'intelligence artificielle. Gagnez du temps et
            augmentez vos conversions.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary/90 transition-colors shadow-lg"
            prefetch={false}
          >
            Commencer maintenant
            <ArrowRight size={20} />
          </Link>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16 md:mb-24">
          <Card className="text-center p-6 md:p-8 shadow-md hover:shadow-lg transition-shadow duration-200">
            <CardContent className="p-0">
              <Zap className="text-primary mx-auto mb-4" size={48} />
              <h3 className="text-xl font-semibold text-foreground mb-3">Recherche Rapide</h3>
              <p className="text-muted-foreground">
                Trouvez des centaines de prospects en quelques secondes grâce à l'IA
              </p>
            </CardContent>
          </Card>

          <Card className="text-center p-6 md:p-8 shadow-md hover:shadow-lg transition-shadow duration-200">
            <CardContent className="p-0">
              <Target className="text-primary mx-auto mb-4" size={48} />
              <h3 className="text-xl font-semibold text-foreground mb-3">Ciblage Précis</h3>
              <p className="text-muted-foreground">
                Prospects qualifiés selon vos critères et votre secteur d'activité
              </p>
            </CardContent>
          </Card>

          <Card className="text-center p-6 md:p-8 shadow-md hover:shadow-lg transition-shadow duration-200">
            <CardContent className="p-0">
              <BarChart3 className="text-primary mx-auto mb-4" size={48} />
              <h3 className="text-xl font-semibold text-foreground mb-3">Scoring Intelligent</h3>
              <p className="text-muted-foreground">Chaque prospect est évalué et classé selon son potentiel</p>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Card className="inline-block p-8 md:p-10 shadow-xl bg-card/80 backdrop-blur-sm">
            <CardContent className="p-0">
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">Prêt à démarrer ?</h2>
              <p className="text-muted-foreground mb-6">Lancez votre première recherche de prospects dès maintenant</p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary/90 transition-colors shadow-lg"
                prefetch={false}
              >
                Accéder au tableau de bord
                <ArrowRight size={20} />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
