// ArtworkLibrary — the seller's print-artwork library (Slice 3 fills this in).
// Slice 1: placeholder shell so the wagon mounts. Real upload + validation +
// listing land in Slice 3.
import React from 'react';
import { CardSection } from '../../../components/admin/ui';

const ArtworkLibrary = ({ shopId }) => {
  return (
    <CardSection title="Original">
      <p className="text-[13px] text-admin-text-muted">
        Här laddar du upp tryckoriginal och ser valideringen mot tryckspecarna.
        (Byggs i nästa steg.)
      </p>
    </CardSection>
  );
};

export default ArtworkLibrary;
