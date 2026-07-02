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
// Unique variant groups (by `group`, falling back to `label`), each with its
// first available image. Used for the subtle swatch hint under the price.
const variantGroups = (variants) => {
  if (!Array.isArray(variants)) return [];
  const seen = new Map();
  for (const v of variants) {
    const key = (v?.group || v?.label || '').trim();
    if (!key || seen.has(key)) continue;
    const image = v?.image || (Array.isArray(v?.images) ? v.images[0] : '') || '';
    seen.set(key, { key, image });
  }
  return Array.from(seen.values());
};

const NordProductCard = ({ to, linkState, image, imageAlt, tag, name, description, meta, priceSek, isFromPrice = false, product, ctaLabel }) => {
  const groups = variantGroups(product?.variants);
  const showHint = groups.length >= 2;
  const thumbs = groups.filter((g) => g.image).slice(0, 4);
  const extra = groups.length - thumbs.length;

  return (
    <Link to={to} state={linkState} className="group block h-full">
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
            <div className="flex items-baseline gap-1 min-w-0">
              {isFromPrice && (
                <span className="text-xs text-ink-muted shrink-0">från</span>
              )}
              <SmartPrice sekPrice={priceSek} className="font-display" showOriginal={false} />
            </div>
            <span className="bg-accent text-white text-sm font-bold px-5 py-2.5 rounded-full whitespace-nowrap transition-transform duration-300 ease-nord group-hover:-translate-y-0.5">
              {ctaLabel}
            </span>
          </div>

          {showHint && (
            <div className="mt-2.5 flex items-center gap-1.5">
              {thumbs.length > 0 ? (
                <>
                  <div className="flex items-center gap-1">
                    {thumbs.map((g) => (
                      <img
                        key={g.key}
                        src={g.image}
                        alt=""
                        className="h-4 w-4 rounded-full object-cover border border-ink/10"
                      />
                    ))}
                  </div>
                  {extra > 0 && (
                    <span className="text-xs text-ink-muted">+{extra}</span>
                  )}
                </>
              ) : (
                <span className="text-xs text-ink-muted">{groups.length} varianter</span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default NordProductCard;
