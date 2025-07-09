import Link from 'next/link';
import { ArrowRight, Zap, Target, BarChart3 } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-800 mb-6">
            🎯 Prospection IA
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Trouvez des prospects qualifiés automatiquement avec l'intelligence artificielle. 
            Gagnez du temps et augmentez vos conversions.
          </p>
          <Link 
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Commencer maintenant
            <ArrowRight size={20} />
          </Link>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="card text-center">
            <Zap className="text-blue-600 mx-auto mb-4" size={48} />
            <h3 className="text-xl font-semibold mb-3">Recherche Rapide</h3>
            <p className="text-gray-600">
              Trouvez des centaines de prospects en quelques secondes grâce à l'IA
            </p>
          </div>
          
          <div className="card text-center">
            <Target className="text-blue-600 mx-auto mb-4" size={48} />
            <h3 className="text-xl font-semibold mb-3">Ciblage Précis</h3>
            <p className="text-gray-600">
              Prospects qualifiés selon vos critères et votre secteur d'activité
            </p>
          </div>
          
          <div className="card text-center">
            <BarChart3 className="text-blue-600 mx-auto mb-4" size={48} />
            <h3 className="text-xl font-semibold mb-3">Scoring Intelligent</h3>
            <p className="text-gray-600">
              Chaque prospect est évalué et classé selon son potentiel
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <div className="card inline-block">
            <h2 className="text-2xl font-semibold mb-4">Prêt à démarrer ?</h2>
            <p className="text-gray-600 mb-6">
              Lancez votre première recherche de prospects dès maintenant
            </p>
            <Link 
              href="/dashboard"
              className="btn-primary"
            >
              Accéder au tableau de bord
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}