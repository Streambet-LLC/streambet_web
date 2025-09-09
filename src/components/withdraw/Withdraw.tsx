import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
		AlertDialog,
		AlertDialogTrigger,
		AlertDialogContent,
		AlertDialogHeader,
		AlertDialogFooter,
		AlertDialogTitle,
		AlertDialogDescription,
		AlertDialogAction,
		AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Trash2, Zap, Clock, CalendarClock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/integrations/api/client';
import { useToast } from '@/hooks/use-toast';
import { getMessage } from '@/utils/helper';

export default function Withdraw({
	amountToWithdraw,
	bankAccounts,
	setWithdrawer,
}) {
	const [selectedAccount, setSelectedAccount] = useState(null);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [accountToDelete, setAccountToDelete] = useState(null);
	const [isAccountDeleting, setAccountDeleting] = useState(false);
	const [selectedSpeed, setSelectedSpeed] = useState<null | 'asap' | 'same_day' | 'standard'>(null);
	const { toast } = useToast();

	const {
        data: withdrawQuote,
        isFetching: isWithdrawQuoteFetching,
        refetch: getWithdrawQuote,
    } = useQuery({
        queryKey: ['withdrawQuote'],
        queryFn: async () => {
            const response = await api.payment.getWithdrawQuote(amountToWithdraw);
            return response;
        },
        enabled: false,
    });

	// Reset and close delete bank account popup
	const handleCloseDelete = () => {
		setAccountToDelete(null);
		setShowDeleteModal(false);
	};

	// Simulate delete function
	const handleConfirmDelete = async () => {
		try {
			setAccountDeleting(true);
			const withdrawerData = await api.wallet.deleteBankAccount(accountToDelete?.token);
			toast({
				title: 'Bank account deleted',
				description: `${accountToDelete?.alias} has been deleted successfully.`,
			});
			console.log('Updated withdrawer data:', withdrawerData);
			setWithdrawer(withdrawerData);
			handleCloseDelete();
		} catch (error) {
			toast({
				title: 'Failed to delete bank account',
				description: getMessage(error || 'An error occurred while deleting the bank account.'),
			});
		} finally {
			setAccountDeleting(false);
		}
	};

	useEffect(() => {
		if (amountToWithdraw) {
			getWithdrawQuote();
		}
	}, [amountToWithdraw]);

	// Render bank account list
	const renderBankList = () => (
		<div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-6 max-w-2xl mx-auto w-full">
			<div className="text-center mb-8">
				<h1 className="text-4xl font-black mb-3 bg-gradient-to-r from-[#BDFF00] via-[#9DFF33] to-[#7DFF66] bg-clip-text text-transparent">
					Choose Account
				</h1>
				<p className="text-gray-400 text-lg">Select your preferred bank account to continue</p>
			</div>
			
			<div className="flex flex-col gap-6 w-full">
				{bankAccounts.map((account) => (
					<div
						key={account.token}
						className="group relative overflow-hidden rounded-3xl p-6 cursor-pointer transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl"
						style={{
							background: 'linear-gradient(135deg, #0D0D0D 0%, #1a1a2e 50%, #16213e 100%)',
							border: '1px solid rgba(189, 255, 0, 0.2)',
							boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(189, 255, 0, 0.05)',
						}}
						onClick={(e) => {
							if (showDeleteModal) return;
							if ((e.target as HTMLElement).closest('.trash-icon')) return;
							setSelectedAccount(account);
							setSelectedSpeed(null);
						}}
						tabIndex={0}
						role="button"
						aria-label={`Select ${account.alias}`}
						onKeyDown={e => {
							if (e.key === 'Enter' || e.key === ' ') setSelectedAccount(account);
						}}
					>
						{/* Glow effect on hover */}
						<div className="absolute inset-0 bg-gradient-to-r from-[#BDFF00]/20 via-[#9DFF33]/20 to-[#7DFF66]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>

						<div className="relative z-10 flex items-center justify-between">
							<div className="flex-1">
								<div className="flex items-center gap-3 mb-3">
									<div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#BDFF00] to-[#9DFF33] flex items-center justify-center">
										<span className="text-black font-bold text-lg">{account.alias.charAt(0)}</span>
									</div>
									<div>
										<div className="font-bold text-xl text-white mb-1">{account.alias}</div>
										<div className="text-[#BDFF00] text-sm font-medium">A/C Ending: {account.last4}</div>
									</div>
								</div>
								<div className="grid grid-cols-2 gap-4 text-sm">
									<div>
										<span className="text-gray-400">Routing #:</span>
										<span className="text-gray-300 ml-2 font-medium">{account.routingNumber}</span>
									</div>
									<div>
										<span className="text-gray-400">RTP Eligible:</span>
										<span className="text-gray-300 ml-2 font-medium">{account.rtpEligible ? 'Yes' : 'No'}</span>
									</div>
									<div>
										<span className="text-gray-400">Reference:</span>
										<span className="text-gray-300 ml-2 font-medium">{account.reference}</span>
									</div>
								</div>
							</div>
							{/* Enhanced trash icon with better hover effects */}
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<span
										className="trash-icon ml-4 rounded-2xl p-3 transition-all duration-300 cursor-pointer group/trash"
										style={{
											background: 'linear-gradient(135deg, rgba(189, 255, 0, 0.1) 0%, rgba(157, 255, 51, 0.2) 100%)',
											border: '1px solid rgba(189, 255, 0, 0.3)',
										}}
										onClick={e => {
											e.stopPropagation();
											setAccountToDelete(account);
											setShowDeleteModal(true);
										}}
										aria-label="Delete Bank Account"
										tabIndex={0}
										onKeyDown={e => {
											if (e.key === 'Enter' || e.key === ' ') {
												e.stopPropagation();
												setAccountToDelete(account);
												setShowDeleteModal(true);
											}
										}}
									>
										<Trash2 
											className="text-[#BDFF00] group-hover/trash:text-[#9DFF33] group-hover/trash:scale-110 transition-all duration-300" 
										/>
									</span>
								</AlertDialogTrigger>
								{showDeleteModal && accountToDelete?.token === account.token && (
									<AlertDialogContent className="bg-gray-900 border border-gray-700">
										<AlertDialogHeader>
											<AlertDialogTitle className="text-white">Delete Bank Account?</AlertDialogTitle>
											<AlertDialogDescription className="text-gray-300">
												Are you sure you want to delete <span className="font-semibold text-white">{account.alias} (ending {account.last4})</span>? This action cannot be undone.
											</AlertDialogDescription>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogCancel className="bg-gray-700 text-white hover:bg-gray-600" onClick={handleCloseDelete}>Cancel</AlertDialogCancel>
											<AlertDialogAction className="bg-red-600 hover:bg-red-700" disabled={isAccountDeleting} onClick={handleConfirmDelete}>{isAccountDeleting ? 'Deleting...' : 'Confirm'}</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								)}
							</AlertDialog>
						</div>
					</div>
				))}
			</div>
		</div>
	);

	// helpers for radio options
	const speedOptions: Array<{ key: 'asap' | 'same_day' | 'standard'; label: string; sublabel?: string; icon: any }> = [
		{ key: 'asap', label: 'Instant', sublabel: 'Popular!', icon: Zap },
		{ key: 'same_day', label: '24 hours', icon: Clock },
		{ key: 'standard', label: '2-3 biz days', icon: CalendarClock },
	];

	// Render quote/withdraw page
	const renderWithdrawPage = () => {
		const grossAmount = (withdrawQuote?.quote?.cents || 0) / 100;
		const selectedObj = selectedSpeed ? (withdrawQuote as any)[selectedSpeed] : null;
		const feeAmount = selectedObj ? (selectedObj.fee.cents || 0) / 100 : 0;
		const netAmount = selectedObj ? (selectedObj.finalSettlement.cents || 0) / 100 : 0;
		const estimated = selectedObj?.expectedDeliveryDate;
		return (
			<div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6 max-w-2xl mx-auto w-full">
				<Button 
					variant="ghost" 
					size="sm" 
					className="mb-6 text-gray-400 hover:text-[#BDFF00] hover:bg-gray-800/50 rounded-xl px-4 py-2 transition-all duration-300 self-start" 
					onClick={() => setSelectedAccount(null)}
				>
					<svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
					</svg>
					Back to Accounts
				</Button>
				
				<div className="text-center mb-8">
					<h1 className="text-4xl font-black mb-3 bg-gradient-to-r from-[#BDFF00] via-[#9DFF33] to-[#7DFF66] bg-clip-text text-transparent">
						Redeem Sweep Coins
					</h1>
					<p className="text-gray-400 text-lg">Complete your redeem request</p>
				</div>

				{/* Bank Account Info Card (updated for new array) */}
				<div
					className="rounded-3xl shadow-2xl p-6 mb-8 border border-gray-700/50 w-full"
					style={{
						background: 'linear-gradient(135deg, #0D0D0D 0%, #1a1a2e 50%, #16213e 100%)',
						boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(189, 255, 0, 0.05)',
					}}
				>
					<div className="flex items-center gap-4 mb-4">
						<div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#BDFF00] to-[#9DFF33] flex items-center justify-center">
							<span className="text-black font-bold text-2xl">{selectedAccount.alias.charAt(0)}</span>
						</div>
						<div>
							<h3 className="text-2xl font-bold text-white mb-1">{selectedAccount.alias}</h3>
							<p className="text-[#BDFF00] font-medium">A/C Ending: {selectedAccount.last4}</p>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-4 text-sm">
						<div>
							<span className="text-gray-400">Routing #:</span>
							<span className="text-gray-300 ml-2 font-medium">{selectedAccount.routingNumber}</span>
						</div>
						<div>
							<span className="text-gray-400">RTP Eligible:</span>
							<span className="text-gray-300 ml-2 font-medium">{selectedAccount.rtpEligible ? 'Yes' : 'No'}</span>
						</div>
						<div>
							<span className="text-gray-400">Reference:</span>
							<span className="text-gray-300 ml-2 font-medium">{selectedAccount.reference}</span>
						</div>
					</div>
				</div>

				{/* Speed selection radios */}
				<div className="w-full mb-8">
					<label className="block text-lg font-semibold mb-3 text-white">Transfer speed</label>
					<div className="grid gap-3">
						{speedOptions
							.filter(o => o.key !== 'asap' || selectedAccount?.rtpEligible)
							.map(({ key, label, sublabel, icon: Icon }) => {
								const isSelected = selectedSpeed === key;
								const fee = (withdrawQuote as any)?.[key]?.fee?.cents / 100 || 0;
								return (
									<label key={key} className={`flex items-center justify-between rounded-2xl p-4 border transition-all cursor-pointer ${isSelected ? 'border-[#BDFF00] bg-[#101314]' : 'border-gray-700 bg-[#0D0D0D] hover:border-gray-600'}`}
										onClick={() => setSelectedSpeed(key)}
									>
										<div className="flex items-center gap-4">
											<div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isSelected ? 'bg-[#BDFF00] text-black' : 'bg-[#141414] text-[#BDFF00] border border-[#203000]'}`}>
												<Icon size={22} />
											</div>
											<div>
												<div className="text-white font-semibold">{label}</div>
												{sublabel && key === 'asap' && (
													<div className="text-xs font-bold text-[#BDFF00]">{sublabel}</div>
												)}
											</div>
										</div>
										<div className="flex items-center gap-3">
											<span className="text-sm"><span className="text-[#BDFF00] font-medium">${fee.toFixed(2)}</span></span>
											<input type="radio" name="speed" className="hidden" checked={isSelected} readOnly />
											<div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'border-[#BDFF00]' : 'border-gray-500'}`}>
												<div className={`w-3 h-3 rounded-full ${isSelected ? 'bg-[#BDFF00]' : 'bg-transparent'}`}></div>
											</div>
										</div>
									</label>
								);
							})}
					</div>
				</div>

				{/* Calculation Summary */}
				<div 
					className="mb-8 rounded-3xl p-6 border border-gray-700/50 w-full"
					style={{ 
						background: 'linear-gradient(135deg, #0D0D0D 0%, #1a1a2e 50%, #16213e 100%)',
						boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
					}}
				>
					<h3 className="text-lg font-semibold text-white mb-4">Transaction Summary</h3>
					<div className="space-y-3">
						<div className="flex justify-between items-center py-2 border-b border-gray-700/50">
							<span className="text-gray-400">Gross Amount</span>
							<span className="text-white font-semibold">${grossAmount.toFixed(2)}</span>
						</div>
						<div className="flex justify-between items-center py-2 border-b border-gray-700/50">
							<span className="text-gray-400">Fee</span>
							<span className="text-red-400 font-semibold">-${feeAmount.toFixed(2)}</span>
						</div>
						<div className="flex justify-between items-center py-3">
							<span className="text-lg font-bold text-white">Net Amount</span>
							<span className="text-2xl font-black text-[#BDFF00]">${netAmount.toFixed(2)}</span>
						</div>
					</div>
				</div>

				{/* Withdraw Button */}
				<Button 
					className="w-full text-xl py-4 rounded-2xl font-bold shadow-2xl transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed" 
					disabled={!selectedSpeed}
					style={{
						background: 'linear-gradient(135deg, #BDFF00 0%, #9DFF33 100%)',
						boxShadow: '0 20px 40px rgba(189, 255, 0, 0.4)',
						color: 'black',
					}}
				>
					{ !isWithdrawQuoteFetching ?
					(selectedSpeed ? `Withdraw $${netAmount.toFixed(2)}` : 'Select a delivery speed') : 'Loading quote...'}
				</Button>

				{/* Estimated delivery */}
				{selectedSpeed && (
					<div className="mt-3 text-center text-gray-400 w-full">
						Estimated delivery: <span className="text-white">{estimated}</span>
					</div>
				)}
			</div>
		);
	};

	return (
		<div className={`${!!selectedAccount && 'mb-6'} z-10`}>
			{!selectedAccount ? renderBankList() : renderWithdrawPage()}
		</div>
	);
}
