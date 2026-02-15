const jwt = require('jsonwebtoken');
const UAParser = require('ua-parser-js');
const Activity = require('../models/Activity');

const activityLogger = async (req, res, next) => {
    // Don't log static files or prefight requests if you want to save space
    if (req.method === 'OPTIONS') {
        return next();
    }

    // Soft Auth Check: Try to identify user even if route doesn't require auth
    if (!req.user && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            const token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
        } catch (err) {
            // Ignore invalid token here, just log as anonymous
        }
    }

    const parser = new UAParser();
    const ua = req.headers['user-agent'];
    const result = parser.setUA(ua).getResult();

    // Capture IP
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    res.on('finish', async () => {
        try {
            // Don't log admin activity viewing to avoid noise? Optional.
            // if (req.originalUrl.includes('/admin/activity')) return;

            const activity = new Activity({
                user: req.user ? (req.user.id || req.user._id) : null,
                method: req.method,
                route: req.originalUrl,
                ip: ip || '',
                browser: result.browser.name || 'Unknown',
                os: result.os.name || 'Unknown',
                device: result.device.type || 'Desktop',
                userAgent: ua || '',
                referrer: req.headers.referrer || req.headers.referer || '',
                timestamp: new Date()
            });

            await activity.save();
        } catch (err) {
            console.error('Error saving activity log:', err);
        }
    });

    next();
};

module.exports = activityLogger;
