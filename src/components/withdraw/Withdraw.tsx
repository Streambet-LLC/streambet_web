import { useState } from 'react';
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
import { Trash2 } from 'lucide-react';

const TAX_RATE = 0.1; // 10% tax for example

export default function Withdraw({
	amountToWithdraw,
	bankAccounts,
}) {
	const [selectedAccount, setSelectedAccount] = useState(null);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [accountToDelete, setAccountToDelete] = useState(null);

	// Simulate delete function
	const handleDelete = () => {
		// TODO: Replace with actual delete logic
		setShowDeleteModal(false);
	};

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
				{bankAccounts.map((account, idx) => (
					<div
						key={account.token}
						className="group relative overflow-hidden rounded-3xl p-6 cursor-pointer transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl"
						style={{
							background: 'linear-gradient(135deg, #0D0D0D 0%, #1a1a2e 50%, #16213e 100%)',
							border: '1px solid rgba(189, 255, 0, 0.2)',
							boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(189, 255, 0, 0.05)',
						}}
						onClick={(e) => {
							if ((e.target as HTMLElement).closest('.trash-icon')) return;
							setSelectedAccount(account);
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
											<AlertDialogCancel className="bg-gray-700 text-white hover:bg-gray-600">Cancel</AlertDialogCancel>
											<AlertDialogAction className="bg-red-600 hover:bg-red-700">Confirm</AlertDialogAction>
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

	// Render quote/withdraw page
	const renderWithdrawPage = () => {
		const amount = Number(amountToWithdraw) || 0;
		const tax = Math.round(amount * TAX_RATE * 100) / 100;
		const netAmount = Math.round((amount - tax) * 100) / 100;
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

				{/* Amount Input */}
				<div className="mb-8 w-full">
					<label className="block text-lg font-semibold mb-3 text-white">Redeem Value</label>
					<div className="relative">
						<span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-2xl text-gray-400">$</span>
						<input
							type="number"
							value={amount}
							disabled
							className="w-full rounded-2xl border-0 px-12 py-4 text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#BDFF00] focus:ring-offset-2 focus:ring-offset-black transition-all duration-300"
							placeholder="0.00"
							style={{ 
								background: 'linear-gradient(135deg, #0D0D0D 0%, #1a1a2e 50%, #16213e 100%)',
								color: 'white',
								border: '1px solid rgba(189, 255, 0, 0.1)',
								boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
							}}
						/>
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
							<span className="text-white font-semibold">${amount.toFixed(2)}</span>
						</div>
						<div className="flex justify-between items-center py-2 border-b border-gray-700/50">
							<span className="text-gray-400">Tax (10%)</span>
							<span className="text-red-400 font-semibold">-${tax.toFixed(2)}</span>
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
					style={{
						background: 'linear-gradient(135deg, #BDFF00 0%, #9DFF33 100%)',
						boxShadow: '0 20px 40px rgba(189, 255, 0, 0.4)',
						color: 'black',
					}}
				>
					{`Withdraw $${netAmount.toFixed(2)}`}
				</Button>
			</div>
		);
	};

	return (
			<div className={`${!!selectedAccount && 'mb-6'} z-10`}>
				{!selectedAccount ? renderBankList() : renderWithdrawPage()}
			</div>
	);
}
