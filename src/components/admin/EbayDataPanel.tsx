import { useState } from 'react';
import { TabSwitch } from '@/components/navigation/TabSwitch';
import { ReportedEbayListingsPanel } from './ReportedEbayListingsPanel';
import { ManageItemDataPanel } from './ManageItemDataPanel';

const EBAY_DATA_TABS = [
  { key: 'manage-item-data', label: 'Manage Item Data' },
  { key: 'reported-listings', label: 'Reported eBay Listings' },
];

export const EbayDataPanel = () => {
  const [activeTab, setActiveTab] = useState('manage-item-data');

  return (
    <div className="space-y-4">
      <TabSwitch
        tabs={EBAY_DATA_TABS}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      {activeTab === 'reported-listings' && <ReportedEbayListingsPanel />}
      {activeTab === 'manage-item-data' && <ManageItemDataPanel />}
    </div>
  );
};
