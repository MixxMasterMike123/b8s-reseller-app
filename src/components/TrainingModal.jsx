import React, { useState } from 'react';
import { 
  XMarkIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  QuestionMarkCircleIcon,
  TrophyIcon,
  MapPinIcon,
  SpeakerWaveIcon,
  HandRaisedIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import ProductDetailPopup from './ProductDetailPopup';

const TrainingModal = ({ isOpen, onClose, onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [productPopupOpen, setProductPopupOpen] = useState(false);
  const [selectedProductVariant, setSelectedProductVariant] = useState(null);

  const handleVariantClick = (variantName) => {
    setSelectedVariant(selectedVariant === variantName ? null : variantName);
    setSelectedProductVariant(variantName);
    setProductPopupOpen(true);
  };

  const slides = [
    {
      id: 'welcome',
      title: 'Välkommen',
      subtitle: 'Till B8Shield återförsäljarportal',
      icon: UserGroupIcon,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      content: (
        <div className="space-y-4">
          <div className="bg-white rounded-lg p-6 border border-blue-200">
            <p className="text-gray-700 mb-4">
              Välkommen till vår återförsäljarportal – ett verktyg för att göra ert samarbete med oss så smidigt som möjligt.
            </p>
            
            <h3 className="font-semibold text-gray-900 mb-3">Funktioner:</h3>
            <ul className="space-y-2">
              <li className="flex items-center text-gray-700">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                Lägga beställningar direkt
              </li>
              <li className="flex items-center text-gray-700">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                Överblick över orderhistorik
              </li>
              <li className="flex items-center text-gray-700">
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                Ladda ner marknadsföringsmaterial
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'problem',
      title: 'Viktig info till butikspersonal',
      subtitle: 'Om B8Shield',
      icon: ExclamationTriangleIcon,
      iconColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
      content: (
        <div className="space-y-4">
          <div className="bg-white rounded-lg p-4 border border-amber-200">
            <p className="text-gray-700 mb-4">
              B8Shield är en ny och unik produkt som löser ett vanligt problem för fiskare - att fastna i undervattensvegetation och andra undervattenshinder.
            </p>
            <p className="text-gray-700 mb-4">
              B8Shield är samtidigt en helt ny typ av både produkt och produktkategori.
            </p>
          </div>
          
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r">
            <p className="text-sm text-amber-800 italic">
              "Kunderna vet därför inte ännu vad B8Shield är eller vilket problem den löser, och därför söker man således inte aktivt efter B8Shield trots att man har problemet med att fastna"
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'actions',
      title: 'Av den orsaken är det avgörande att ni',
      subtitle: 'För att sälja B8Shield',
      icon: ExclamationTriangleIcon,
      iconColor: 'text-red-600',
      bgColor: 'bg-red-50',
      content: (
        <div className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-start bg-white rounded-lg p-4 border border-blue-200">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
              <div className="ml-3">
                <p className="text-sm text-gray-700">
                  Ge butiksstället en synlig och central plats i butiken, gärna nära kassan.
                </p>
              </div>
            </div>
            
            <div className="flex items-start bg-white rounded-lg p-4 border border-blue-200">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
              <div className="ml-3">
                <p className="text-sm text-gray-700">
                  Aktivt säljer och förklarar produkten för kunderna. Gör man inte det är sannolikheten stor att kunderna inte uppmärksammar produkten och därmed inte köper produkten vilket vare sig vi eller ni vinner på.
                </p>
              </div>
            </div>
            
            <div className="flex items-start bg-white rounded-lg p-4 border border-blue-200">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
              <div className="ml-3">
                <p className="text-sm text-gray-700">
                  För att försäkra säljprocessen ytterligare skickar vi också med ett antal lösa B8Shields. Med fördel kan dessa läggas i en skål vid stället så att kund kan få klämma och känna på produkten.
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 border-l-4 border-green-400 p-3 rounded-r mt-4">
            <p className="text-sm text-green-800 italic">
              "När kunden dock väl förstår vad B8Shield är och gör, är den lätt att välja, men kunden måste förstå det först"
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'pitch',
      title: 'Så förklarar du produkten på 15 sekunder',
      subtitle: 'Säg detta till kunden',
      icon: UserGroupIcon,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-50',
      content: (
        <div className="space-y-4">
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <div className="flex items-center mb-3">
              <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3">1</span>
              <p className="text-sm font-medium">
                B8Shield hindrar fiskedrag från att fastna i undervattensvegetation och andra undervattenshinder.
              </p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <div className="flex items-start">
              <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-1">2</span>
              <div className="flex-1">
                <p className="text-sm font-medium mb-3">B8Shield finns i 4 olika utföranden:</p>
                
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: 'TRANSPARENT', desc: 'När man inte vill kompromissa med fiskedragets naturliga färger och utseende' },
                    { name: 'BETESRÖD', desc: 'Utnyttja den traditionella röda färgen på många betesfiskar för att attrahera mer fisk' },
                    { name: 'FLUORESCERANDE', desc: 'När du skall natt fiska och vill attrahera fiskar i grumliga eller mörka vatten' },
                    { name: 'GLITTER', desc: 'När man skall fiska i stark solljus hjälper dess gnistrande färg till med att attrahera mer fisk' }
                  ].map((variant, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleVariantClick(variant.name)}
                      className={`text-left p-2 rounded border text-xs transition-all hover:shadow-md ${
                        selectedVariant === variant.name 
                          ? 'border-green-500 bg-green-50 shadow-md' 
                          : 'border-gray-200 hover:border-green-300 hover:bg-green-25'
                      }`}
                    >
                      <div className="font-semibold">{variant.name}</div>
                      <div className="text-gray-600">{variant.desc}</div>
                      <div className="text-xs text-blue-600 mt-1">Klicka för detaljer</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-green-200">
            <div className="flex items-center">
              <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3">3</span>
              <p className="text-sm">
                B8Shield fästs på tre-krok. Passat till krokstorlek 2, 4 och 6, där storlek 2 också passar på krokstorlek 1. Krokstorlek 1/0 och 2/0 kommer inom kort.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-green-200">
            <div className="flex items-center">
              <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3">4</span>
              <p className="text-sm">
                B8Shields är designad så att man enkelt kan växla den mellan olika drag vid behov.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'objections',
      title: 'Vanliga frågor',
      subtitle: 'Och vad du svarar',
      icon: QuestionMarkCircleIcon,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r">
            <div className="flex items-center mb-2">
              <QuestionMarkCircleIcon className="h-4 w-4 text-blue-600 mr-2" />
              <h4 className="font-semibold text-blue-900">Kommer fisken sluta hugga?</h4>
            </div>
            <div className="flex items-start">
              <ChatBubbleLeftRightIcon className="h-4 w-4 text-blue-600 mr-2 mt-0.5" />
              <p className="text-sm text-blue-800">
                <strong>Svar:</strong> Nej, B8Shield påverkar inte krokens förmåga att kroka fisk. Under ett bett flexar sköldens vingar för att exponera krokarna, vilket säkerställer en lyckad fångst. Du krokar helt enkelt fisken som vanligt.
              </p>
            </div>
          </div>
          
          <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r">
            <div className="flex items-center mb-2">
              <QuestionMarkCircleIcon className="h-4 w-4 text-green-600 mr-2" />
              <h4 className="font-semibold text-green-900">Förstör det gången på draget?</h4>
            </div>
            <div className="flex items-start">
              <ChatBubbleLeftRightIcon className="h-4 w-4 text-green-600 mr-2 mt-0.5" />
              <p className="text-sm text-green-800">
                <strong>Svar:</strong> Nej, B8Shield är testad med många typer av drag. Ingen skillnad i gång.
              </p>
            </div>
          </div>
          
          <div className="bg-purple-50 border-l-4 border-purple-400 p-4 rounded-r">
            <div className="flex items-center mb-2">
              <QuestionMarkCircleIcon className="h-4 w-4 text-purple-600 mr-2" />
              <h4 className="font-semibold text-purple-900">När ska man använda den?</h4>
            </div>
            <div className="flex items-start">
              <ChatBubbleLeftRightIcon className="h-4 w-4 text-purple-600 mr-2 mt-0.5" />
              <p className="text-sm text-purple-800">
                <strong>Svar:</strong> När du fiskar där det finns många undervattenhinder som ex. undervattensvegetation eller där det är stenigt, alltså där fisken ofta gömmer sig.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'completion',
      title: 'Grattis!',
      subtitle: 'Du är nu certifierad B8Shield-säljare',
      icon: TrophyIcon,
      iconColor: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      content: (
        <div className="text-center space-y-6">
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white rounded-lg p-6">
            <TrophyIcon className="h-16 w-16 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Certifierad B8Shield-Säljare</h3>
            <p className="text-yellow-100">Du har genomfört säljutbildningen</p>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-2">Nu kan du:</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li className="flex items-center">
                <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
                Förklara B8Shield på 15 sekunder
              </li>
              <li className="flex items-center">
                <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
                Hantera kundinvändningar
              </li>
              <li className="flex items-center">
                <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
                Öka din försäljning med rätt teknik
              </li>
            </ul>
          </div>
        </div>
      )
    }
  ];

  const currentSlideData = slides[currentSlide];
  const isLastSlide = currentSlide === slides.length - 1;
  const isFirstSlide = currentSlide === 0;

  const handleNext = () => {
    if (isLastSlide) {
      onComplete?.();
      onClose();
    } else {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstSlide) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-[#459CA8] px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <currentSlideData.icon className="h-6 w-6 text-white mr-3" />
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {currentSlideData.title}
                  </h2>
                  <p className="text-sm text-white/90">
                    {currentSlideData.subtitle}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white/70 hover:text-white transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content - Now flexible height */}
          <div className="px-6 py-6 flex-grow overflow-y-auto bg-white">
            {currentSlideData.content}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <div className="flex flex-col space-y-3">
              {/* Step counter and progress bar */}
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>Steg {currentSlide + 1} av {slides.length}</span>
                <span>{Math.round(((currentSlide + 1) / slides.length) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-[#459CA8] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
                />
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handlePrev}
                  disabled={isFirstSlide}
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isFirstSlide
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  <ArrowLeftIcon className="h-4 w-4 mr-2" />
                  Föregående
                </button>
                
                <div className="flex items-center text-xs text-gray-500">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  ~{5 - currentSlide} min kvar
                </div>
                
                <button
                  onClick={handleNext}
                  className="flex items-center px-6 py-2 bg-[#EE7E31] text-white rounded-lg text-sm font-medium hover:bg-[#EE7E31]/90 transition-colors"
                >
                  {isLastSlide ? (
                    <>
                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                      Börja sälja!
                    </>
                  ) : (
                    <>
                      Nästa
                      <ArrowRightIcon className="h-4 w-4 ml-2" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Detail Popup */}
      <ProductDetailPopup
        isOpen={productPopupOpen}
        onClose={() => setProductPopupOpen(false)}
        variantType={selectedProductVariant}
      />
    </>
  );
};

export default TrainingModal; 