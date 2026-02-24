const User = require('../models/User');
const Activity = require('../models/Activity');

exports.getStats = async (req, res) => {
    try {
        // User counts by role
        const [totalUsers, participants, admins, recruiters, onlineUsers, activeUsers, inactiveUsers] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ role: 'participant' }),
            User.countDocuments({ role: 'admin' }),
            User.countDocuments({ role: 'recruiter' }),
            User.countDocuments({ isOnline: true }),
            User.countDocuments({ isActive: true }),
            User.countDocuments({ isActive: false }),
        ]);

        // New users this week
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const newUsersThisWeek = await User.countDocuments({ createdAt: { $gte: oneWeekAgo } });

        // Total activity logs
        const totalLogs = await Activity.countDocuments();

        // Recent 7 activity logs
        const recentActivity = await Activity.find()
            .populate('user', 'username name email avatar')
            .sort({ timestamp: -1 })
            .limit(7)
            .exec();

        // Activity per day (last 7 days)
        const activityPerDay = [];
        for (let i = 6; i >= 0; i--) {
            const dayStart = new Date();
            dayStart.setDate(dayStart.getDate() - i);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayStart);
            dayEnd.setHours(23, 59, 59, 999);
            const count = await Activity.countDocuments({
                timestamp: { $gte: dayStart, $lte: dayEnd }
            });
            activityPerDay.push({
                date: dayStart.toISOString().split('T')[0],
                count
            });
        }

        res.status(200).json({
            totalUsers,
            participants,
            admins,
            recruiters,
            onlineUsers,
            activeUsers,
            inactiveUsers,
            newUsersThisWeek,
            totalLogs,
            recentActivity,
            activityPerDay
        });
    } catch (err) {
        console.error('Dashboard stats error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};
