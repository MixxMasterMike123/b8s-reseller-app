import { db } from '../firebase/config';
import { collection, getDocs } from 'firebase/firestore';

// Generate Google Shopping Product Feed XML
export const generateProductFeed = async () => {
  const products = await getDocs(collection(db, 'products'));
  
  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>B8Shield - Vasskydd för fiskedrag</title>
    <link>https://shop.b8shield.com</link>
    <description>Innovativa vasskydd för dina fiskedrag</description>
    ${products.docs.map(doc => {
      const product = doc.data();
      // Only include products available for B2C
      if (!product.availability?.b2c) return '';
      
      return `
    <item>
      <g:id>${doc.id}</g:id>
      <g:title>${product.name}</g:title>
      <g:description>${product.descriptions?.b2c || product.description}</g:description>
      <g:link>https://shop.b8shield.com/produkt/${doc.id}</g:link>
      <g:image_link>${product.b2cImageUrl || product.imageUrl}</g:image_link>
      <g:condition>new</g:condition>
      <g:availability>${product.stock > 0 ? 'in stock' : 'out of stock'}</g:availability>
      <g:price>${product.b2cPrice || product.basePrice} SEK</g:price>
      <g:brand>B8Shield</g:brand>
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
    "brand": {
      "@type": "Brand",
      "name": "B8Shield"
    },
    "offers": {
      "@type": "Offer",
      "url": `https://shop.b8shield.com/produkt/${product.id}`,
      "priceCurrency": "SEK",
      "price": product.b2cPrice || product.basePrice,
      "priceValidUntil": new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      "itemCondition": "https://schema.org/NewCondition",
      "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": "B8Shield"
      }
    },
    "sku": product.id,
    "gtin13": product.eanCode || undefined,
    "category": "Sporting Goods > Outdoor Recreation > Fishing > Fishing Tackle > Fishing Lures & Flies"
  };
}; 