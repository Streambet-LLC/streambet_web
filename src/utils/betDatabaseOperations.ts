import { supabase } from '@/integrations/supabase/client';

interface UpdateBetParams {
  betId: string;
  betAmount: number;
  selectedOption: string;
}

interface CreateBetParams {
  streamId: string;
  userId: string;
  betAmount: number;
  selectedOption: string;
}

interface CreateBetCommentParams {
  streamId: string;
  username: string;
  betAmount: number;
  selectedOption: string;
  isUpdate: boolean;
}

interface UpdateWalletParams {
  userId: string;
  betAmount: number;
  walletBalance: number;
  selectedOption: string;
}

export const updateExistingBet = async ({ betId, betAmount, selectedOption }: UpdateBetParams) => {
  const { error, data } = await supabase
    .from('stream_bets')
    .update({
      amount: betAmount,
      bet_option: selectedOption,
    })
    .eq('id', betId)
    .select();

  if (error) {
    console.error('Error updating bet:', error);
    throw error;
  }

  return data;
};

export const createNewBet = async ({
  streamId,
  userId,
  betAmount,
  selectedOption,
}: CreateBetParams) => {
  try {
    const { error, data } = await supabase
      .from('stream_bets')
      .insert({
        stream_id: streamId,
        user_id: userId,
        amount: betAmount,
        bet_option: selectedOption,
      })
      .select();

    if (error) {
      if (error.code === '23505') {
        console.log('Bet already exists, fetching and updating instead...');
        const { data: existingBet } = await supabase
          .from('stream_bets')
          .select('id')
          .eq('user_id', userId)
          .eq('stream_id', streamId)
          .eq('status', 'pending')
          .single();

        if (existingBet) {
          return updateExistingBet({
            betId: existingBet.id,
            betAmount,
            selectedOption,
          });
        }
      }

      console.error('Error placing bet:', error);
      throw error;
    }

    console.log('Successfully placed bet:', data);
    return data;
  } catch (error) {
    console.error('Unexpected error in createNewBet:', error);
    throw error;
  }
};

export const checkExistingBet = async (userId: string, streamId: string) => {
  try {
    const { data, error } = await supabase
      .from('stream_bets')
      .select('id, amount, bet_option, status')
      .eq('user_id', userId)
      .eq('stream_id', streamId)
      .eq('status', 'pending')
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking for existing bets:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error in checkExistingBet:', error);
    return null;
  }
};

export const createBetComment = async ({
  streamId,
  username,
  betAmount,
  selectedOption,
  isUpdate,
}: CreateBetCommentParams) => {
  if (!username) return null;

  const commentContent = isUpdate
    ? `${username} updated bet to ${betAmount} Free Coins on ${selectedOption}`
    : `${username} placed a ${betAmount} Free Coins bet on ${selectedOption}`;

  console.log(`Creating bet ${isUpdate ? 'update ' : ''}notification comment:`, commentContent);

  const { error, data } = await supabase
    .from('comments')
    .insert({
      content: commentContent,
      user_id: 'system', // Use system identifier for bet notifications
      stream_id: streamId,
    })
    .select();

  if (error) {
    console.error(`Error creating bet ${isUpdate ? 'update ' : ''}comment:`, error);
    return null;
  }

  console.log(`Successfully created bet ${isUpdate ? 'update ' : ''}comment:`, data);
  return data;
};

export const updateWalletForBet = async ({
  userId,
  betAmount,
  walletBalance,
  selectedOption,
}: UpdateWalletParams) => {
  const { error: transactionError } = await supabase.from('wallet_transactions').insert({
    user_id: userId,
    amount: -betAmount,
    type: 'bet',
    description: `Bet on ${selectedOption}`,
  });

  if (transactionError) {
    console.error('Error creating transaction:', transactionError);
    throw transactionError;
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      wallet_balance: walletBalance - betAmount,
    })
    .eq('id', userId);

  if (updateError) {
    console.error('Error updating wallet balance:', updateError);
    throw updateError;
  }
};

export const updateStreamTotalBets = async (streamId: string) => {
  try {
    const { data: currentStreamData, error: streamError } = await supabase
      .from('streams')
      .select('total_bets')
      .eq('id', streamId)
      .single();

    if (streamError) {
      console.error('Error fetching current stream total:', streamError);
    } else {
      console.log('Current stream total_bets before update:', currentStreamData?.total_bets);
    }

    const { data: totalBets, error: totalError } = await supabase
      .from('stream_bets')
      .select('amount')
      .eq('stream_id', streamId)
      .eq('status', 'pending');

    if (!totalError && totalBets) {
      const sum = totalBets.reduce((acc, bet) => acc + Number(bet.amount), 0);
      console.log(`Calculated sum of ${totalBets.length} bets:`, sum);

      const { data: updateData, error: updateStreamError } = await supabase
        .from('streams')
        .update({ total_bets: sum })
        .eq('id', streamId)
        .select('total_bets')
        .single();

      if (updateStreamError) {
        console.error('Error updating stream total:', updateStreamError);
      } else {
        console.log('Updated stream total_bets to:', updateData?.total_bets);
      }
    } else if (totalError) {
      console.error('Error calculating total from bets:', totalError);
    }
  } catch (err) {
    console.error('Unexpected error updating total_bets:', err);
  }
};
