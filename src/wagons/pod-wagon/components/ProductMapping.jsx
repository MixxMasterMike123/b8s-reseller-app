// ProductMapping — maps a validated artwork → product SKU + placement (Slice 4
// fills this in). Slice 1: placeholder shell. Products are a SEPARATE entity —
// this never edits products; it stores a shopId+sku→artwork mapping the printer
// joins against at order time.
import React from 'react';
import { CardSection } from '../../../components/admin/ui';

const ProductMapping = ({ shopId }) => {
  return (
    <CardSection title="Produktkoppling">
      <p className="text-[13px] text-admin-text-muted">
        Här kopplar du ett original till en produkt-SKU och anger placering.
        (Byggs i nästa steg.)
      </p>
    </CardSection>
  );
};

export default ProductMapping;
