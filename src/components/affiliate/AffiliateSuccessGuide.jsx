import React, { useState } from 'react';
import { useTranslation } from '../../contexts/TranslationContext';
import {
  BookOpenIcon,
  UserGroupIcon,
  RocketLaunchIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  WrenchScrewdriverIcon,
  QuestionMarkCircleIcon,
  ClipboardDocumentCheckIcon,
  HeartIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';

const AffiliateSuccessGuide = () => {
  const { t } = useTranslation();
  const [expandedSection, setExpandedSection] = useState(null);

  const sections = [
    {
      id: 'what-is-b8shield',
      title: t('success_what_is_b8shield_title', '1. What is B8Shield?'),
      icon: <BookOpenIcon className="h-6 w-6" />,
      content: (
        <>
          <p className="mb-4">{t('success_what_is_b8shield_intro', 'B8Shield is a unique innovation that prevents treble-hook lures from getting caught in underwater vegetation – without affecting the ability to hook fish.')}</p>
          <p className="font-medium mb-2">{t('success_how_it_works', 'How it works:')}</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>{t('success_how_it_works_1', 'Rigid wings deflect weeds and branches')}</li>
            <li>{t('success_how_it_works_2', 'Wings fold back when a fish strikes')}</li>
            <li>{t('success_how_it_works_3', 'Easy to attach – no tools required')}</li>
            <li>{t('success_how_it_works_4', 'Fits all treble-hook lures')}</li>
          </ul>
          <p className="mt-4 font-medium">{t('success_unique_product', 'There is no other product on the market that does this.')}</p>
        </>
      )
    },
    {
      id: 'target-audience',
      title: t('success_target_audience_title', '2. Who buys B8Shield?'),
      icon: <UserGroupIcon className="h-6 w-6" />,
      content: (
        <>
          <p className="mb-4">{t('success_target_audience_intro', 'The target audience includes both sport anglers and recreational fishermen, primarily in the Northern Hemisphere.')}</p>
          <div className="space-y-4">
            <div>
              <p className="font-medium">{t('success_sport_anglers_label', 'Sport anglers:')}</p>
              <p>{t('success_sport_anglers_desc', 'Want to cast in tricky or weed-heavy spots but avoid it due to the risk of snagging. B8Shield makes aggressive casting possible without fear.')}</p>
            </div>
            <div>
              <p className="font-medium">{t('success_recreational_anglers_label', 'Recreational anglers:')}</p>
              <p>{t('success_recreational_anglers_desc', 'Hate losing expensive lures. B8Shield saves them money by reducing snags and lost gear.')}</p>
            </div>
          </div>
        </>
      )
    },
    {
      id: 'your-role',
      title: t('success_your_role_title', '3. Your Role as an Affiliate'),
      icon: <RocketLaunchIcon className="h-6 w-6" />,
      content: (
        <>
          <ul className="space-y-4">
            <li><span className="font-medium">{t('success_commission_label', 'Commission:')}</span> {t('success_commission_value', '20% on the net price (71.20 SEK excluding VAT)')}</li>
            <li><span className="font-medium">{t('success_customer_discount_label', 'Customer discount:')}</span> {t('success_customer_discount_value', '10% when purchasing through your tracking link')}</li>
            <li>
              <span className="font-medium">{t('success_you_get_access', 'You get access to:')}</span>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>{t('success_access_tracking_links', 'Tracking links')}</li>
                <li>{t('success_access_test_products', 'Test products')}</li>
                <li>{t('success_access_official_content', 'Official images, videos, and copy')}</li>
                <li>{t('success_access_support', 'Support from the B8Shield team')}</li>
              </ul>
            </li>
          </ul>
          <p className="mt-4 text-sm text-gray-600">{t('success_brand_guidelines_note', 'Note: You must follow the B8Shield brand guidelines and communication instructions.')}</p>
        </>
      )
    },
    {
      id: 'getting-started',
      title: t('success_getting_started_title', '4. Getting Started – for Beginners'),
      icon: <ChartBarIcon className="h-6 w-6" />,
      content: (
        <ol className="list-decimal pl-6 space-y-3">
          <li>{t('success_gs_use_product', 'Use the product yourself (if possible)')}</li>
          <li>{t('success_gs_share_experience', 'Share your real experience – e.g., video, image, blog post')}</li>
          <li>{t('success_gs_tell_story', 'Tell a story – show how B8Shield solves a real problem')}</li>
          <li>{t('success_gs_use_link_smartly', 'Use your link smartly – in bio, stories, comments, YouTube descriptions')}</li>
          <li>{t('success_gs_be_consistent', 'Be consistent – success comes from ongoing effort, not one-time posts')}</li>
        </ol>
      )
    },
    {
      id: 'advanced-strategies',
      title: t('success_advanced_strategies_title', '5. Advanced Strategies for Experienced Affiliates'),
      icon: <LightBulbIcon className="h-6 w-6" />,
      content: (
        <ul className="list-disc pl-6 space-y-3">
          <li>{t('success_as_content_series', 'Create content series, like "3 places I never dared to cast until now"')}</li>
          <li>{t('success_as_how_to_videos', 'Make how-to videos showing how to rig and use B8Shield')}</li>
          <li>{t('success_as_giveaways', 'Run giveaways to drive engagement')}</li>
          <li>{t('success_as_ab_testing', 'A/B test different content types, headlines, and formats')}</li>
          <li>{t('success_as_address_objections', 'Address objections, especially the myth that B8Shield prevents hooking fish – show how the wings fold back on strike')}</li>
        </ul>
      )
    },
    {
      id: 'channel-guide',
      title: t('success_channel_guide_title', '6. Channel-by-Channel Guide'),
      icon: <ChatBubbleLeftRightIcon className="h-6 w-6" />,
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="font-medium mb-2">Instagram</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t('success_instagram_reels_stories', 'Use Reels and Stories for personal experiences or test results')}</li>
              <li>{t('success_instagram_tracking_links', 'Add tracking links in bio or via Linktree')}</li>
              <li>{t('success_instagram_before_after', 'Show before/after results and casting locations')}</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">YouTube</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t('success_youtube_publish_content', 'Publish reviews, tutorials, and comparisons')}</li>
              <li>{t('success_youtube_add_link', 'Add your link in the description')}</li>
              <li>{t('success_youtube_optimize_seo', 'Optimize for search terms like "stop losing fishing lures" or "snag prevention tips"')}</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">TikTok</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t('success_tiktok_visual_demos', 'Create short, visual demos of how B8Shield works')}</li>
              <li>{t('success_tiktok_use_humor', 'Use humor, personal stories, or surprising comparisons')}</li>
              <li>{t('success_tiktok_highlight_wings', 'Highlight the wing-folding function and snag resistance')}</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">{t('success_blog_website_label', 'Blog or Website')}</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t('success_blog_seo_content', 'Write SEO-friendly content like:')}
                <ul className="list-disc pl-6 mt-2">
                  <li>{t('success_blog_tip_1', '"Top 3 tips to stop losing your lures"')}</li>
                  <li>{t('success_blog_tip_2', '"Essential gear for serious anglers"')}</li>
                </ul>
              </li>
              <li>{t('success_blog_affiliate_links', 'Include affiliate links in multiple spots')}</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">{t('success_facebook_groups_label', 'Facebook Groups')}</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t('success_facebook_engage', 'Engage in discussions, answer questions, and provide real value')}</li>
              <li>{t('success_facebook_no_hard_sell', 'Never hard-sell – instead, share your own solution-oriented stories')}</li>
              <li>{t('success_facebook_post_content', 'Post useful videos or personal reviews')}</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'common-mistakes',
      title: t('success_common_mistakes_title', '7. Common Mistakes to Avoid'),
      icon: <ExclamationTriangleIcon className="h-6 w-6" />,
      content: (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">{t('success_mistakes_table_header_mistake', 'Mistake')}</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">{t('success_mistakes_table_header_solution', 'What to do instead')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-4 py-2">{t('success_mistake_post_once', 'Posting once and giving up')}</td>
                <td className="px-4 py-2">{t('success_solution_content_schedule', 'Build a content schedule')}</td>
              </tr>
              <tr>
                <td className="px-4 py-2">{t('success_mistake_drop_links', 'Dropping links without context')}</td>
                <td className="px-4 py-2">{t('success_solution_share_story', 'Share a personal story first')}</td>
              </tr>
              <tr>
                <td className="px-4 py-2">{t('success_mistake_false_claims', 'Making false claims')}</td>
                <td className="px-4 py-2">{t('success_solution_show_benefits', 'Show the real benefit with examples')}</td>
              </tr>
              <tr>
                <td className="px-4 py-2">{t('success_mistake_off_brand', 'Creating off-brand content')}</td>
                <td className="px-4 py-2">{t('success_solution_use_official', 'Use official resources and guidelines')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )
    },
    {
      id: 'tools',
      title: t('success_tools_title', '8. Tools You Can Use'),
      icon: <WrenchScrewdriverIcon className="h-6 w-6" />,
      content: (
        <ul className="list-disc pl-6 space-y-2">
          <li><span className="font-medium">Canva</span> – {t('success_tool_canva', 'create graphics')}</li>
          <li><span className="font-medium">CapCut</span> – {t('success_tool_capcut', 'edit videos')}</li>
          <li><span className="font-medium">Linktree</span> – {t('success_tool_linktree', 'collect your links in a bio')}</li>
          <li><span className="font-medium">Google Trends</span> – {t('success_tool_google_trends', 'find hot fishing topics')}</li>
          <li><span className="font-medium">ChatGPT</span> – {t('success_tool_chatgpt', 'get ideas and content drafts')}</li>
        </ul>
      )
    },
    {
      id: 'faq',
      title: t('success_faq_title', '9. Common Questions (FAQ)'),
      icon: <QuestionMarkCircleIcon className="h-6 w-6" />,
      content: (
        <div className="space-y-6">
          <div>
            <p className="font-medium mb-2">{t('success_faq_q1', 'Q: Does B8Shield prevent hooking fish?')}</p>
            <p>{t('success_faq_a1', 'A: No – the wings fold back when a fish strikes, allowing for a clean hook set.')}</p>
          </div>
          <div>
            <p className="font-medium mb-2">{t('success_faq_q2', 'Q: Does it work on all lures?')}</p>
            <p>{t('success_faq_a2', 'A: B8Shield is designed for treble-hook lures, which are most common in spinning.')}</p>
          </div>
          <div>
            <p className="font-medium mb-2">{t('success_faq_q3', 'Q: Can I use my own images or videos?')}</p>
            <p>{t('success_faq_a3', 'A: Yes, as long as they follow our brand guidelines.')}</p>
          </div>
          <div>
            <p className="font-medium mb-2">{t('success_faq_q4', 'Q: Can I run my own campaigns or ads?')}</p>
            <p>{t('success_faq_a4', 'A: Yes, as long as you use your tracking link and follow our rules.')}</p>
          </div>
        </div>
      )
    },
    {
      id: 'checklist',
      title: t('success_checklist_title', '10. Checklist – Get Started in an Hour'),
      icon: <ClipboardDocumentCheckIcon className="h-6 w-6" />,
      content: (
        <ul className="list-disc pl-6 space-y-3">
          <li>{t('success_checklist_signup', 'Sign up for the affiliate program')}</li>
          <li>{t('success_checklist_get_link', 'Get your unique link')}</li>
          <li>{t('success_checklist_test_product', 'Test B8Shield if you have the product')}</li>
          <li>{t('success_checklist_first_post', 'Publish your first post, story, or video')}</li>
          <li>{t('success_checklist_add_link', 'Add your link to your profiles or content')}</li>
          <li>{t('success_checklist_plan_content', 'Start planning weekly content')}</li>
        </ul>
      )
    },
    {
      id: 'closing',
      title: t('success_closing_title', 'Closing Words'),
      icon: <HeartIcon className="h-6 w-6" />,
      content: (
        <>
          <p className="mb-4">{t('success_closing_intro', 'When you recommend B8Shield, you don\'t just earn commission – you help other anglers:')}</p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>{t('success_closing_benefit_1', 'Fish in hard-to-reach spots')}</li>
            <li>{t('success_closing_benefit_2', 'Stop losing their favorite lures')}</li>
            <li>{t('success_closing_benefit_3', 'Save money and fish with more confidence')}</li>
          </ul>
          <p className="font-medium">{t('success_closing_outro', 'This is real product value. Let\'s change fishing – together.')}</p>
        </>
      )
    }
  ];

  const toggleSection = (sectionId) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {t('success_guide_title', 'Success Manager')}
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          {t('success_guide_subtitle', 'Your complete guide to becoming a successful B8Shield affiliate. Learn proven strategies, avoid common mistakes, and maximize your earnings.')}
        </p>
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-blue-600">
                    {section.icon}
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {section.title}
                  </h3>
                </div>
                <div className="text-gray-400">
                  {expandedSection === section.id ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </div>
              </div>
            </button>
            
            {expandedSection === section.id && (
              <div className="px-6 pb-6 border-t border-gray-200">
                <div className="pt-4 prose prose-sm max-w-none">
                  {section.content}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          {t('success_guide_footer', 'Need help? Contact our affiliate support team for personalized guidance.')}
        </p>
      </div>
    </div>
  );
};

export default AffiliateSuccessGuide; 