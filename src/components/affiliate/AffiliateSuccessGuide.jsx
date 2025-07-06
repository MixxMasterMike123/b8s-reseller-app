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
      title: '1. What is B8Shield?',
      icon: <BookOpenIcon className="h-6 w-6" />,
      content: (
        <>
          <p className="mb-4">B8Shield is a unique innovation that prevents treble-hook lures from getting caught in underwater vegetation – without affecting the ability to hook fish.</p>
          <p className="font-medium mb-2">How it works:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Rigid wings deflect weeds and branches</li>
            <li>Wings fold back when a fish strikes</li>
            <li>Easy to attach – no tools required</li>
            <li>Fits all treble-hook lures</li>
          </ul>
          <p className="mt-4 font-medium">There is no other product on the market that does this.</p>
        </>
      )
    },
    {
      id: 'target-audience',
      title: '2. Who buys B8Shield?',
      icon: <UserGroupIcon className="h-6 w-6" />,
      content: (
        <>
          <p className="mb-4">The target audience includes both sport anglers and recreational fishermen, primarily in the Northern Hemisphere.</p>
          <div className="space-y-4">
            <div>
              <p className="font-medium">Sport anglers:</p>
              <p>Want to cast in tricky or weed-heavy spots but avoid it due to the risk of snagging. B8Shield makes aggressive casting possible without fear.</p>
            </div>
            <div>
              <p className="font-medium">Recreational anglers:</p>
              <p>Hate losing expensive lures. B8Shield saves them money by reducing snags and lost gear.</p>
            </div>
          </div>
        </>
      )
    },
    {
      id: 'your-role',
      title: '3. Your Role as an Affiliate',
      icon: <RocketLaunchIcon className="h-6 w-6" />,
      content: (
        <>
          <ul className="space-y-4">
            <li><span className="font-medium">Commission:</span> 20% on the net price (71.20 SEK excluding VAT)</li>
            <li><span className="font-medium">Customer discount:</span> 10% when purchasing through your tracking link</li>
            <li>
              <span className="font-medium">You get access to:</span>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>Tracking links</li>
                <li>Test products</li>
                <li>Official images, videos, and copy</li>
                <li>Support from the B8Shield team</li>
              </ul>
            </li>
          </ul>
          <p className="mt-4 text-sm text-gray-600">Note: You must follow the B8Shield brand guidelines and communication instructions.</p>
        </>
      )
    },
    {
      id: 'getting-started',
      title: '4. Getting Started – for Beginners',
      icon: <ChartBarIcon className="h-6 w-6" />,
      content: (
        <ol className="list-decimal pl-6 space-y-3">
          <li>Use the product yourself (if possible)</li>
          <li>Share your real experience – e.g., video, image, blog post</li>
          <li>Tell a story – show how B8Shield solves a real problem</li>
          <li>Use your link smartly – in bio, stories, comments, YouTube descriptions</li>
          <li>Be consistent – success comes from ongoing effort, not one-time posts</li>
        </ol>
      )
    },
    {
      id: 'advanced-strategies',
      title: '5. Advanced Strategies for Experienced Affiliates',
      icon: <LightBulbIcon className="h-6 w-6" />,
      content: (
        <ul className="list-disc pl-6 space-y-3">
          <li>Create content series, like "3 places I never dared to cast until now"</li>
          <li>Make how-to videos showing how to rig and use B8Shield</li>
          <li>Run giveaways to drive engagement</li>
          <li>A/B test different content types, headlines, and formats</li>
          <li>Address objections, especially the myth that B8Shield prevents hooking fish – show how the wings fold back on strike</li>
        </ul>
      )
    },
    {
      id: 'channel-guide',
      title: '6. Channel-by-Channel Guide',
      icon: <ChatBubbleLeftRightIcon className="h-6 w-6" />,
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="font-medium mb-2">Instagram</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use Reels and Stories for personal experiences or test results</li>
              <li>Add tracking links in bio or via Linktree</li>
              <li>Show before/after results and casting locations</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">YouTube</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Publish reviews, tutorials, and comparisons</li>
              <li>Add your link in the description</li>
              <li>Optimize for search terms like "stop losing fishing lures" or "snag prevention tips"</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">TikTok</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Create short, visual demos of how B8Shield works</li>
              <li>Use humor, personal stories, or surprising comparisons</li>
              <li>Highlight the wing-folding function and snag resistance</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Blog or Website</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Write SEO-friendly content like:
                <ul className="list-disc pl-6 mt-2">
                  <li>"Top 3 tips to stop losing your lures"</li>
                  <li>"Essential gear for serious anglers"</li>
                </ul>
              </li>
              <li>Include affiliate links in multiple spots</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Facebook Groups</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li>Engage in discussions, answer questions, and provide real value</li>
              <li>Never hard-sell – instead, share your own solution-oriented stories</li>
              <li>Post useful videos or personal reviews</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'common-mistakes',
      title: '7. Common Mistakes to Avoid',
      icon: <ExclamationTriangleIcon className="h-6 w-6" />,
      content: (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Mistake</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">What to do instead</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-4 py-2">Posting once and giving up</td>
                <td className="px-4 py-2">Build a content schedule</td>
              </tr>
              <tr>
                <td className="px-4 py-2">Dropping links without context</td>
                <td className="px-4 py-2">Share a personal story first</td>
              </tr>
              <tr>
                <td className="px-4 py-2">Making false claims</td>
                <td className="px-4 py-2">Show the real benefit with examples</td>
              </tr>
              <tr>
                <td className="px-4 py-2">Creating off-brand content</td>
                <td className="px-4 py-2">Use official resources and guidelines</td>
              </tr>
            </tbody>
          </table>
        </div>
      )
    },
    {
      id: 'tools',
      title: '8. Tools You Can Use',
      icon: <WrenchScrewdriverIcon className="h-6 w-6" />,
      content: (
        <ul className="list-disc pl-6 space-y-2">
          <li>Canva – for making graphics</li>
          <li>CapCut – for editing videos</li>
          <li>Linktree – to organize links in one bio page</li>
          <li>Google Trends – to find hot topics in fishing</li>
          <li>ChatGPT – for content ideas and drafts</li>
        </ul>
      )
    },
    {
      id: 'faq',
      title: '9. Frequently Asked Questions (FAQ)',
      icon: <QuestionMarkCircleIcon className="h-6 w-6" />,
      content: (
        <div className="space-y-4">
          <div>
            <p className="font-medium">Q: Does B8Shield prevent hooking fish?</p>
            <p>A: No – the wings fold back when a fish strikes, allowing a clean hookset.</p>
          </div>
          <div>
            <p className="font-medium">Q: Does it work on all lures?</p>
            <p>A: B8Shield is designed for treble-hook lures, which are most common in spin fishing.</p>
          </div>
          <div>
            <p className="font-medium">Q: Can I use my own pictures or videos?</p>
            <p>A: Yes, if they follow our brand guidelines.</p>
          </div>
          <div>
            <p className="font-medium">Q: Can I run my own campaigns or ads?</p>
            <p>A: Yes, as long as you use your tracking link and respect our brand rules.</p>
          </div>
        </div>
      )
    },
    {
      id: 'checklist',
      title: '10. Checklist – Get Started in One Hour',
      icon: <ClipboardDocumentCheckIcon className="h-6 w-6" />,
      content: (
        <ul className="list-disc pl-6 space-y-2">
          <li>Sign up for the affiliate program</li>
          <li>Get your unique link</li>
          <li>Test B8Shield if you have the product</li>
          <li>Publish your first post, story, or video</li>
          <li>Add your link to your profiles or content</li>
          <li>Start planning weekly content</li>
        </ul>
      )
    },
    {
      id: 'final-words',
      title: 'Final Words',
      icon: <HeartIcon className="h-6 w-6" />,
      content: (
        <>
          <p className="mb-4">By recommending B8Shield, you're not just earning commission – you're helping other anglers:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Fish in hard-to-reach spots</li>
            <li>Avoid losing their favorite lures</li>
            <li>Save money and gain confidence</li>
          </ul>
          <p className="mt-4 font-medium">This is what real product value looks like. Let's change fishing – together.</p>
        </>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <span className="text-gray-500">{section.icon}</span>
              <h3 className="text-lg font-medium text-gray-900">{section.title}</h3>
            </div>
            <svg
              className={`h-5 w-5 text-gray-500 transform transition-transform ${
                expandedSection === section.id ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedSection === section.id && (
            <div className="px-6 py-4 border-t border-gray-200">
              {section.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default AffiliateSuccessGuide; 