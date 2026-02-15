const Activity = require('../models/Activity');
const User = require('../models/User');

exports.getLogs = async (req, res) => {
    try {
        const { page = 1, limit = 10, userId, route, ip, dateFrom, dateTo } = req.query;

        const query = {};

        if (userId) {
            // Allow searching by exact ID or username/name regex
            if (userId.match(/^[0-9a-fA-F]{24}$/)) {
                query.user = userId;
            } else {
                // If searching by name, we need to find users first
                const users = await User.find({
                    $or: [
                        { username: { $regex: userId, $options: 'i' } },
                        { name: { $regex: userId, $options: 'i' } }
                    ]
                });
                query.user = { $in: users.map(u => u._id) };
            }
        }

        if (route) {
            query.route = { $regex: route, $options: 'i' };
        }

        if (ip) {
            query.ip = { $regex: ip, $options: 'i' };
        }

        if (dateFrom || dateTo) {
            query.timestamp = {};
            if (dateFrom) query.timestamp.$gte = new Date(dateFrom);
            if (dateTo) query.timestamp.$lte = new Date(dateTo);
        }

        const logs = await Activity.find(query)
            .populate('user', 'username name email')
            .sort({ timestamp: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const count = await Activity.countDocuments(query);

        res.status(200).json({
            logs,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            total: count
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getMyLogs = async (req, res) => {
    try {
        const { page = 1, limit = 10, route, ip, dateFrom, dateTo } = req.query;

        // Force query to current user
        // Handle both id and _id just in case
        const userId = req.user.id || req.user._id;
        const query = { user: userId };

        if (route) {
            query.route = { $regex: route, $options: 'i' };
        }

        if (ip) {
            query.ip = { $regex: ip, $options: 'i' };
        }

        if (dateFrom || dateTo) {
            query.timestamp = {};
            if (dateFrom) query.timestamp.$gte = new Date(dateFrom);
            if (dateTo) query.timestamp.$lte = new Date(dateTo);
        }

        const logs = await Activity.find(query)
            .sort({ timestamp: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const count = await Activity.countDocuments(query);

        res.status(200).json({
            logs,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            total: count
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getLogById = async (req, res) => {
    try {
        const log = await Activity.findById(req.params.id).populate('user', 'username name email');
        if (!log) {
            return res.status(404).json({ message: 'Log not found' });
        }
        res.status(200).json(log);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};
