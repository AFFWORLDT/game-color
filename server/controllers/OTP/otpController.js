const otpGenerator = require('otp-generator');
const myCache = require('../../helper/myCache'); // Import your cache module

// Function to generate OTP (अब hardcoded)
const generateOTP = () => {
    return '123456'; // Hardcoded OTP
};

const otpController = async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber) {
            throw new Error('Phone number is required');
        }

        // Check if OTP for this phone number is cached
        let otp = myCache.get(phoneNumber);
        if (!otp) {
            // OTP not found in cache, generate a new one
            otp = generateOTP();
            // Cache the OTP with the default TTL
            myCache.set(phoneNumber, otp, 180);
        }

        // Respond with OTP (for testing/demo only)
        res.status(200).json({
            success: true,
            message: 'OTP generated successfully (demo mode)',
            otp: otp // Note: In production, OTP should not be sent in response!
        });
    } catch (error) {
        console.error('Error in OTP controller:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate OTP'
        });
    }
};

module.exports = otpController;
