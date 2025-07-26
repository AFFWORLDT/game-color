const UserModel = require('../models/UserModel');
const BetModel = require('../models/UserBetModel');
const myCache = require('../helper/myCache')

const userBetController = async (req, res) => {
    try {
        const countPeriod = await myCache.get('countPeriods');
        console.log('🎲 Bet placed for period:', countPeriod);
        const { userId } = req.params;
        const { color, betAmount } = req.body;

        // Check if required fields are provided
        if (!color || !betAmount || !userId) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }
        
        // Find user by ID and check wallet balance
        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.wallet < betAmount) {
            return res.status(400).json({
                success: false,
                message: 'Low balance'
            });
        }

        // Deduct bet amount from user's wallet
        user.wallet -= betAmount;
        await user.save();
        console.log('💰 Deducted', betAmount, 'from user', userId, 'New balance:', user.wallet);

        // Create new user bet document
        const userBet = new BetModel({ userId, color, betAmount, period: countPeriod });
        await userBet.save();
        console.log('💾 Bet saved for period:', countPeriod, 'Color:', color, 'Amount:', betAmount);

        res.status(200).json({
            success: true,
            message: 'User bet data saved successfully'
        });

    } catch (error) {
        console.error('Error in userBetColor controller:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}

module.exports = { userBetController };
