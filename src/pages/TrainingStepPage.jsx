import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from '../contexts/TranslationContext';
import { 
  XMarkIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  QuestionMarkCircleIcon,
  TrophyIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import ProductDetailPopup from '../components/ProductDetailPopup';

const TrainingStepPage = () => {
  const { t } = useTranslation();
  const { step } = useParams();
  const navigate = useNavigate();
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [productPopupOpen, setProductPopupOpen] = useState(false);
  const [selectedProductVariant, setSelectedProductVariant] = useState(null);

  const currentSlide = parseInt(step) - 1;

  const handleVariantClick = (variantName) => {
    setSelectedVariant(selectedVariant === variantName ? null : variantName);
    setSelectedProductVariant(variantName);
    setProductPopupOpen(true);
  };

  const slides = [
    {
      id: 'problem',
      title: t('training.staff_info_title', 'Viktig info till butikspersonal'),
      subtitle: t('training.about_b8shield', 'Om B8Shield'),
      icon: ExclamationTriangleIcon,
      iconColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
      content: (
        <div className="space-y-4">
          <div className="bg-white rounded-lg p-4 border border-amber-200">
            <p className="text-gray-700 mb-4">
              {t('training.b8shield_intro_1', 'B8Shield är en ny och unik produkt som löser ett vanligt problem för fiskare - att fastna i undervattensvegetation och andra undervattenshinder.')}
            </p>
            <p className="text-gray-700 mb-4">
              {t('training.b8shield_intro_2', 'B8Shield är samtidigt en helt ny typ av både produkt och produktkategori.')}
            </p>
          </div>
          
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r">
            <p className="text-sm text-amber-800 italic">
              "{t('training.customer_awareness_quote', 'Kunderna vet därför inte ännu vad B8Shield är eller vilket problem den löser, och därför söker man således inte aktivt efter B8Shield trots att man har problemet med att fastna')}"
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'actions',
      title: t('training.key_actions_title', 'För att sälja B8Shield är det avgörande att ni'),
      subtitle: t('training.to_sell_b8shield', 'För att sälja B8Shield'),
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
                  {t('training.action_1', 'Ger butiksstället en synlig och central plats i butiken, gärna nära kassan.')}
                </p>
              </div>
            </div>
            
            <div className="flex items-start bg-white rounded-lg p-4 border border-blue-200">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
              <div className="ml-3">
                <p className="text-sm text-gray-700">
                  {t('training.action_2', 'Aktivt säljer och förklarar produkten för kunderna. Gör man inte det är sannolikheten stor att kunderna inte uppmärksammar produkten och därmed inte köper produkten vilket vare sig vi eller ni vinner på.')}
                </p>
              </div>
            </div>
            
            <div className="flex items-start bg-white rounded-lg p-4 border border-blue-200">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
              <div className="ml-3">
                <p className="text-sm text-gray-700">
                  {t('training.action_3', 'För att försäkra säljprocessen ytterligare skickar vi också med ett antal lösa B8Shields. Med fördel kan dessa läggas i en skål vid stället så att kund kan få klämma och känna på produkten.')}
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-4 bg-green-50 border-l-4 border-green-400 p-3 rounded-r">
            <p className="text-sm text-green-800 italic">
              "{t('training.understanding_quote', 'När kunden dock väl förstår vad B8Shield är och gör, är den lätt att välja, men kunden måste förstå det först')}".
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'explanation',
      title: t('training.pitch_title', 'Så förklarar du produkten på 15 sekunder'),
      subtitle: t('training.pitch_subtitle', 'Säg detta till kunden'),
      icon: UserGroupIcon,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-50',
      content: (
        <div className="space-y-4">
          <div className="space-y-4 text-sm text-gray-700">
            <div className="flex items-start bg-white rounded-lg p-4 border border-green-200">
              <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</span>
              <span>{t('training.pitch_point_1', 'B8Shield hindrar fiskedrag från att fastna i undervattensvegetation och andra undervattenshinder.')}</span>
            </div>
            
            <div className="flex items-start bg-white rounded-lg p-4 border border-green-200">
              <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</span>
              <div className="flex-1">
                <p className="text-sm font-medium mb-3">{t('training.pitch_point_2_intro', 'B8Shield finns i 4 olika utföranden:')}</p>
                
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: t('training.variant_transparent_simple', 'Transparent'), key: 'TRANSPARENT' },
                    { name: t('training.variant_red_simple', 'Röd'), key: 'RÖD' },
                    { name: t('training.variant_fluorescent_simple', 'Fluorescerande'), key: 'FLUORESCERANDE' },
                    { name: t('training.variant_glitter_simple', 'Glitter'), key: 'GLITTER' }
                  ].map((variant, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleVariantClick(variant.key)}
                      className={`text-center p-3 rounded border text-sm font-semibold transition-all hover:shadow-md ${
                        selectedVariant === variant.key 
                          ? 'border-green-500 bg-green-50 shadow-md' 
                          : 'border-gray-200 hover:border-green-300 hover:bg-green-25'
                      }`}
                    >
                      <div className="font-semibold">{variant.name}</div>
                      <div className="text-xs text-blue-600 mt-1">{t('training.click_for_details', 'Klicka för detaljer')}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex items-start bg-white rounded-lg p-4 border border-green-200">
              <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</span>
              <span>{t('training.pitch_point_3', 'B8Shield fästs på tre-krok. Passat till krokstorlek 2, 4 och 6, där storlek 2 också passar på krokstorlek 1. Krokstorlek 1/0 och 2/0 kommer inom kort.')}</span>
            </div>
            
            <div className="flex items-start bg-white rounded-lg p-4 border border-green-200">
              <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">4</span>
              <span>{t('training.pitch_point_4', 'B8Shields är designad så att man enkelt kan växla den mellan olika drag vid behov.')}</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'faq',
      title: t('training.objections_title', 'Vanliga frågor'),
      subtitle: t('training.objections_subtitle', 'Och vad du svarar'),
      icon: QuestionMarkCircleIcon,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      content: (
        <div className="space-y-4">
          <div className="space-y-4">
            <div className="border-l-4 border-blue-400 pl-4 bg-blue-50 py-3 rounded-r">
              <h4 className="text-sm font-medium text-blue-900 mb-2">{t('training.objection_1_question', 'Kommer fisken sluta hugga?')}</h4>
              <p className="text-xs text-blue-800">
                <strong>{t('training.answer_label', 'Svar:')}</strong> {t('training.objection_1_answer', 'Nej, B8Shield påverkar inte krokens förmåga att kroka fisk. Under ett bett flexar sköldens vingar för att exponera krokarna, vilket säkerställer en lyckad fångst. Du krokar helt enkelt fisken som vanligt.')}
              </p>
            </div>
            
            <div className="border-l-4 border-green-400 pl-4 bg-green-50 py-3 rounded-r">
              <h4 className="text-sm font-medium text-green-900 mb-2">{t('training.objection_2_question', 'Förstör det gången på draget?')}</h4>
              <p className="text-xs text-green-800">
                <strong>{t('training.answer_label', 'Svar:')}</strong> {t('training.objection_2_answer', 'Nej, B8Shield är testad med många typer av drag. Ingen skillnad i gång.')}
              </p>
            </div>
            
            <div className="border-l-4 border-purple-400 pl-4 bg-purple-50 py-3 rounded-r">
              <h4 className="text-sm font-medium text-purple-900 mb-2">{t('training.objection_3_question', 'När ska man använda den?')}</h4>
              <p className="text-xs text-purple-800">
                <strong>{t('training.answer_label', 'Svar:')}</strong> {t('training.objection_3_answer', 'När du fiskar där det finns många undervattenhinder som ex. undervattensvegetation eller där det är stenigt, alltså där fisken ofta gömmer sig.')}
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'completion',
      title: t('training.completion_title', 'Grattis!'),
      subtitle: t('training.completion_subtitle', 'Du är nu certifierad B8Shield-specialist'),
      icon: TrophyIcon,
      iconColor: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      content: (
        <div className="text-center space-y-6">
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white rounded-lg p-6">
            <TrophyIcon className="h-16 w-16 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">{t('training.certified_seller', 'Certifierad B8Shield specialist')}</h3>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-2">{t('training.now_you_can', 'Nu kan du:')}</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li className="flex items-center">
                <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
                {t('training.skill_1', 'Förklara B8Shield på 15 sekunder')}
              </li>
              <li className="flex items-center">
                <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
                {t('training.skill_2', 'Hantera kundinvändningar')}
              </li>
              <li className="flex items-center">
                <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
                {t('training.skill_3', 'Öka din försäljning med rätt teknik')}
              </li>
            </ul>
          </div>
        </div>
      )
    }
  ];

  const currentSlideData = slides[currentSlide];
  const isFirstSlide = currentSlide === 0;
  const isLastSlide = currentSlide === slides.length - 1;

  const handleNext = () => {
    if (isLastSlide) {
      // Redirect to dashboard on completion
      navigate('/dashboard');
    } else {
      navigate(`/training/step/${currentSlide + 2}`);
    }
  };

  const handlePrev = () => {
    if (!isFirstSlide) {
      navigate(`/training/step/${currentSlide}`);
    }
  };

  const handleClose = () => {
    navigate('/dashboard');
  };

  // Redirect to dashboard if invalid step
  useEffect(() => {
    if (currentSlide < 0 || currentSlide >= slides.length) {
      navigate('/dashboard');
    }
  }, [currentSlide, navigate]);

  if (currentSlide < 0 || currentSlide >= slides.length) {
    return null;
  }

  return (
    <>
      {/* Mobile Training Page - Matching Original Modal Design */}
      <div className="min-h-screen flex flex-col bg-white">
        {/* Header - Matching Original Modal */}
        <header className="bg-[#459CA8] px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex-shrink-0">
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
              onClick={handleClose}
              className="text-white/70 hover:text-white transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </header>

        {/* Content - Matching Original Modal */}
        <main className="px-4 sm:px-6 py-4 sm:py-6 flex-grow overflow-y-auto bg-white pb-32">
          {currentSlideData.content}
        </main>

        {/* Footer - Matching Original Modal */}
        <footer className="fixed bottom-0 left-0 right-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex flex-col space-y-3">
            {/* Step counter and progress bar */}
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>{t('training.step_counter', 'Steg {{current}} av {{total}}', { current: currentSlide + 1, total: slides.length })}</span>
              <span>{Math.round(((currentSlide + 1) / slides.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-[#459CA8] h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
              />
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-2 gap-2">
              <button
                onClick={handlePrev}
                disabled={isFirstSlide}
                className={`flex items-center px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                  isFirstSlide
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                <ArrowLeftIcon className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">{t('training.previous', 'Föregående')}</span>
              </button>
              
              <div className="flex items-center text-xs text-gray-500 px-2">
                <ClockIcon className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">{t('training.time_remaining', '~{{minutes}} min kvar', { minutes: 5 - currentSlide })}</span>
                <span className="sm:hidden">{5 - currentSlide}m</span>
              </div>
              
              <button
                onClick={handleNext}
                className="flex items-center px-4 sm:px-6 py-2 bg-[#EE7E31] text-white rounded-lg text-sm font-medium hover:bg-[#EE7E31]/90 transition-colors min-h-[44px]"
              >
                {isLastSlide ? (
                  <>
                    <CheckCircleIcon className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">{t('training.start_selling', 'Börja sälja!')}</span>
                    <span className="sm:hidden">Klar!</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">{t('training.next', 'Nästa')}</span>
                    <span className="sm:hidden">→</span>
                    <ArrowRightIcon className="h-4 w-4 ml-1 sm:ml-2" />
                  </>
                )}
              </button>
            </div>
          </div>
        </footer>
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

export default TrainingStepPage; 