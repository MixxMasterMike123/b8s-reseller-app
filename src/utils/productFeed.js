import { db } from '../firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { DEFAULT_SHOP_ID } from '../config/tenancy';

// Generate Google Shopping Product Feed XML
export const generateProductFeed = async (shopId) => {
  const products = await getDocs(query(collection(db, 'products'), where('shopId', '==', shopId || DEFAULT_SHOP_ID)));
  
  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Produktflöde</title>
    <link>${typeof window !== 'undefined' ? window.location.origin : ''}</link>
    <description>Produktflöde</description>
    ${products.docs.map(doc => {
      const product = doc.data();
      // Only include products available for B2C
      if (!product.availability?.b2c) return '';
      
      return `
    <item>
      <g:id>${doc.id}</g:id>
      <g:title>${product.name}</g:title>
      <g:description>${product.descriptions?.b2c || product.description}</g:description>
      <g:link>${typeof window !== 'undefined' ? window.location.origin : ''}/product/${doc.id}</g:link>
      <g:image_link>${product.b2cImageUrl || product.imageUrl}</g:image_link>
      <g:condition>new</g:condition>
      <g:availability>${product.stock > 0 ? 'in stock' : 'out of stock'}</g:availability>
      <g:price>${product.b2cPrice || product.basePrice} SEK</g:price>
      ${product.brand ? `<g:brand>${product.brand}</g:brand>` : ''}
      <g:gtin>${product.eanCode || ''}</g:gtin>
      <g:identifier_exists>no</g:identifier_exists>
      <g:google_product_category>Sporting Goods > Outdoor Recreation > Fishing > Fishing Tackle > Fishing Lures &amp; Flies</g:google_product_category>
      <g:custom_label_0>${product.size || 'Standard'}</g:custom_label_0>
      <g:shipping>
        <g:country>SE</g:country>
        <g:service>Standard</g:service>
        <g:price>49 SEK</g:price>
      </g:shipping>
    </item>`;
    }).join('')}
  </channel>
</rss>`;

  return xmlContent;
};

// Generate Schema.org structured data for a product
export const generateProductSchema = (product) => {
  if (!product) return null;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": product.descriptions?.b2c || product.description,
    "image": [
      product.b2cImageUrl || product.imageUrl,
      ...(product.b2cImageGallery || [])
    ],
    ...(product.brand ? { "brand": { "@type": "Brand", "name": product.brand } } : {}),
    "offers": {
      "@type": "Offer",
      "url": typeof window !== 'undefined' ? window.location.href : undefined,
      "priceCurrency": "SEK",
      "price": product.b2cPrice || product.basePrice,
      "priceValidUntil": new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      "itemCondition": "https://schema.org/NewCondition",
      "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
    },
    "sku": product.id,
    "gtin13": product.eanCode || undefined,
    ...(product.category ? { "category": product.category } : {})
  };
}; 