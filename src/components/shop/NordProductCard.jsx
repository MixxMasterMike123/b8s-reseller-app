import React from 'react';
import { Link } from 'react-router-dom';
import SmartPrice from './SmartPrice';

/**
 * NordProductCard — the single product card of the NORD design system
 * (see DESIGN.md §4). White module on the warm canvas, soft shadow,
 * hover = lift + slow image zoom. Accent appears only on the CTA.
 *
 * Used for every product flavor on the storefront (regular groups,
 * special editions, clothing) — the optional `tag` pill is the only
 * thing that differs between them.
 */
const NordProductCard = ({ to, image, imageAlt, tag, name, description, meta, priceSek, ctaLabel }) => {
  return (
    <Link to={to} className="group block h-full">
      <div className="bg-white h-full flex flex-col rounded-tile shadow-tile overflow-hidden transition-all duration-300 ease-nord group-hover:-translate-y-1 group-hover:shadow-lift">
        <div className="relative aspect-square overflow-hidden bg-[#F7F5F2]">
          <img
            src={image}
            alt={imageAlt || name}
            className="w-full h-full object-cover transition-transform duration-700 ease-nord group-hover:scale-105"
          />
          {tag && (
            <span className="absolute top-3.5 left-3.5 bg-white/90 backdrop-blur-sm text-ink text-xs font-bold px-3 py-1.5 rounded-full">
              {tag}
            </span>
          )}
        </div>

        <div className="flex flex-col flex-1 p-5">
          <h3 className="font-display font-bold text-lg text-ink leading-snug tracking-tight">
            {name}
          </h3>
          {description && (
            <p className="text-sm text-ink-muted leading-relaxed mt-1 line-clamp-2">
              {description}
            </p>
          )}
          {meta && (
            <p className="text-xs text-ink-faint mt-2">
              {meta}
            </p>
          )}

          <div className="mt-auto pt-4 flex items-center justify-between gap-3">
            <SmartPrice sekPrice={priceSek} className="font-display" showOriginal={false} />
            <span className="bg-accent text-white text-sm font-bold px-5 py-2.5 rounded-full whitespace-nowrap transition-transform duration-300 ease-nord group-hover:-translate-y-0.5">
              {ctaLabel}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default NordProductCard;
