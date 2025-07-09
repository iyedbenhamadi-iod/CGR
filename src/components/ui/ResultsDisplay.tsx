'use client';

import React from 'react';
import { Building2, Users, Mail, Star, ExternalLink, MapPin, Phone, Linkedin, CheckCircle, AlertCircle } from 'lucide-react';

interface Contact {
  name: string;
  position: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  verified: boolean;
}

interface Prospect {
  company: string;
  sector: string;
  size: string;
  address: string;
  website: string;
  contacts: Contact[];
  score: number;
  reason: string;
  sources: string[];
}

interface ResultsDisplayProps {
  prospects: Prospect[];
  totalFound: number;
  cached: boolean;
  sources: string[];
  searchId?: string;
}

// Fonction utilitaire pour valider et nettoyer les URLs
function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return false;
  }
  
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

// Fonction pour extraire le nom d'hôte de manière sécurisée
function getHostname(url: string): string {
  if (!isValidUrl(url)) {
    return 'Source invalide';
  }
  
  try {
    return new URL(url).hostname;
  } catch (error) {
    return 'Source invalide';
  }
}

// Fonction pour vérifier si l'email est verrouillé
function isEmailLocked(email?: string): boolean {
  return !email || email.includes('email_not_unlocked') || email.includes('locked');
}

// Composant pour afficher un contact individuel
function ContactCard({ contact }: { contact: Contact }) {
  const emailLocked = isEmailLocked(contact.email);
  
  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h5 className="font-medium text-gray-900">{contact.name}</h5>
          <p className="text-sm text-gray-600">{contact.position}</p>
        </div>
        <div className="flex items-center gap-1">
          {contact.verified ? (
            <CheckCircle className="text-green-500" size={16} />
          ) : (
            <AlertCircle className="text-yellow-500" size={16} />
          )}
          <span className="text-xs text-gray-500">
            {contact.verified ? 'Vérifié' : 'Non vérifié'}
          </span>
        </div>
      </div>
      
      <div className="space-y-1">
        {/* Email */}
        <div className="flex items-center gap-2">
          <Mail className="text-gray-400" size={14} />
          {emailLocked ? (
            <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
              Email disponible après déverrouillage
            </span>
          ) : (
            <span className="text-sm text-blue-600">{contact.email}</span>
          )}
        </div>
        
        {/* Téléphone */}
        {contact.phone && (
          <div className="flex items-center gap-2">
            <Phone className="text-gray-400" size={14} />
            <span className="text-sm text-gray-700">{contact.phone}</span>
          </div>
        )}
        
        {/* LinkedIn */}
        {contact.linkedin && (
          <div className="flex items-center gap-2">
            <Linkedin className="text-gray-400" size={14} />
            <a 
              href={contact.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              Profil LinkedIn
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResultsDisplay({ 
  prospects, 
  totalFound, 
  cached, 
  sources 
}: ResultsDisplayProps) {
  if (!prospects || prospects.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">Aucun prospect trouvé pour cette recherche.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header résultats */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-green-800">
              🎯 {totalFound} prospects trouvés
            </h3>
            <p className="text-sm text-green-600">
              {cached ? '⚡ Résultats du cache (instantané)' : '🔍 Nouvelle recherche IA'}
            </p>
          </div>
        </div>
      </div>

      {/* Liste des prospects */}
      <div className="grid gap-6">
        {prospects.map((prospect, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            {/* Header avec entreprise et score */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <Building2 className="text-blue-600 flex-shrink-0" size={24} />
                <div>
                  <h4 className="font-semibold text-lg text-gray-800">
                    {prospect.company}
                  </h4>
                  <p className="text-sm text-gray-600">{prospect.sector}</p>
                  {prospect.website && (
                    <a 
                      href={prospect.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      <ExternalLink size={12} />
                      Site web
                    </a>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-1 bg-blue-100 px-3 py-1 rounded-full">
                <Star className="text-blue-600" size={14} />
                <span className="text-sm font-medium text-blue-700">
                  {prospect.score}/10
                </span>
              </div>
            </div>

            {/* Informations générales */}
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Users className="text-gray-400 flex-shrink-0" size={16} />
                <span className="text-sm text-gray-600">{prospect.size}</span>
              </div>
              
              {prospect.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="text-gray-400 flex-shrink-0 mt-0.5" size={16} />
                  <span className="text-sm text-gray-600">{prospect.address}</span>
                </div>
              )}
            </div>

            {/* Raison */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Pourquoi ce prospect : </span>
                {prospect.reason}
              </p>
            </div>

            {/* Contacts */}
            {prospect.contacts && prospect.contacts.length > 0 && (
              <div className="mb-4">
                <h5 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                  <Users className="text-gray-600" size={16} />
                  Contacts identifiés ({prospect.contacts.length})
                </h5>
                <div className="grid gap-3">
                  {prospect.contacts.map((contact, contactIndex) => (
                    <ContactCard key={contactIndex} contact={contact} />
                  ))}
                </div>
              </div>
            )}

            {/* Sources */}
            {prospect.sources && prospect.sources.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">Sources :</span>
                {prospect.sources
                  .filter(source => isValidUrl(source))
                  .slice(0, 3)
                  .map((source, idx) => (
                    <a
                      key={idx}
                      href={source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded"
                    >
                      <ExternalLink size={10} />
                      {getHostname(source)}
                    </a>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer sources globales */}
      {sources && sources.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <ExternalLink className="text-gray-600" size={16} />
            Sources utilisées pour cette recherche
          </h4>
          <div className="flex flex-wrap gap-2">
            {[...new Set(sources)]
              .filter(source => isValidUrl(source))
              .slice(0, 10)
              .map((source, idx) => (
                <a
                  key={idx}
                  href={source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs bg-white px-3 py-1 rounded-full border hover:bg-blue-50 hover:border-blue-200 transition-colors"
                >
                  {getHostname(source)}
                </a>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}