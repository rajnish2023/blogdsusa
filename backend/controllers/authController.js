const User = require("../models/User");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  refreshCookieOptions,
} = require("../utils/tokens");
const { sendEmail } = require("../utils/mailer");

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  status: user.status,
  avatarColor: user.avatarColor,
  avatarUrl: user.avatarUrl,
  designation: user.designation,
  about: user.about,
  lastLogin: user.lastLogin,
  socialLinks: user.socialLinks || { linkedin: "", twitter: "", facebook: "", instagram: "" },
  schemaMarkup: user.schemaMarkup || [],
  role: user.role && {
    id: user.role._id,
    name: user.role.name,
    isSuperAdmin: user.role.isSuperAdmin,
    permissions: user.role.permissions,
  },
});

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() })
      .select("+password +failedLoginAttempts +lockUntil")
      .populate("role");
 
    const invalidMsg = "Incorrect email or password";
    if (!user) return res.status(401).json({ message: invalidMsg });

    if (user.isLocked) {
      return res.status(423).json({
        message: "Too many failed attempts. This account is temporarily locked — try again in a few minutes.",
      });
    }

    if (user.status === "suspended") {
      return res.status(403).json({ message: "This account has been suspended. Contact an administrator." });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      await user.registerFailedLogin();
      return res.status(401).json({ message: invalidMsg });
    }

    await user.registerSuccessfulLogin();

    const accessToken = signAccessToken(user._id.toString());
    const refreshToken = signRefreshToken(user._id.toString());
    user.refreshTokenHash = hashToken(refreshToken);
    await user.save({ validateBeforeSave: false });

    res.cookie("refreshToken", refreshToken, refreshCookieOptions());
    res.json({ accessToken, user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ message: "Login failed. Please try again." });
  }
};

exports.refresh = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ message: "Not signed in" });

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      res.clearCookie("refreshToken", refreshCookieOptions());
      return res.status(401).json({ message: "Session expired, please sign in again" });
    }

    const user = await User.findById(payload.sub).select("+refreshTokenHash").populate("role");
    if (!user || user.refreshTokenHash !== hashToken(token)) {
      return res.status(401).json({ message: "Session no longer valid, please sign in again" });
    }
    if (user.status === "suspended") {
      return res.status(403).json({ message: "This account has been suspended" });
    }
 
    const newRefreshToken = signRefreshToken(user._id.toString());
    user.refreshTokenHash = hashToken(newRefreshToken);
    await user.save({ validateBeforeSave: false });
    res.cookie("refreshToken", newRefreshToken, refreshCookieOptions());

    const accessToken = signAccessToken(user._id.toString());
    res.json({ accessToken, user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ message: "Could not refresh session" });
  }
};

exports.logout = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      try {
        const payload = verifyRefreshToken(token);
        await User.findByIdAndUpdate(payload.sub, { $unset: { refreshTokenHash: 1 } });
      } catch {
        
      }
    }
    res.clearCookie("refreshToken", refreshCookieOptions());
    res.json({ message: "Signed out" });
  } catch (err) {
    res.status(500).json({ message: "Logout failed" });
  }
};

exports.me = async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
};
 
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    const genericMsg = "If that email is registered, you will receive reset instructions shortly.";
 
    if (!user) {
      return res.status(200).json({ message: genericMsg });
    }
 
    const crypto = require("crypto");
    const plainToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(plainToken).digest("hex");

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save({ validateBeforeSave: false });
 
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const resetUrl = `${clientUrl}/reset-password/${plainToken}`;
 
    const html = `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #3355FF; margin-top: 0;">Dynamics Square Password Reset</h2>
        <p>You requested a password reset for your administrator account.</p>
        <p>Please click the button below to set a new password. This link is valid for 1 hour:</p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="${resetUrl}" style="background-color: #3355FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p style="font-size: 12px; color: #666;">If the button doesn't work, copy and paste this link in your browser:</p>
        <p style="font-size: 12px; color: #666; word-break: break-all;">${resetUrl}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 11px; color: #999; margin-bottom: 0;">If you did not request this, please ignore this email.</p>
      </div>
    `;

    const text = `Dynamics Square Password Reset\n\nYou requested a password reset for your administrator account.\n\nPlease copy and paste the following link into your browser to reset your password (valid for 1 hour):\n\n${resetUrl}\n\nIf you did not request this, please ignore this email.`;
 
    const mailResult = await sendEmail({
      to: user.email,
      subject: "Dynamics Square — Password Reset Link",
      html,
      text,
    });
 
    const isDev = process.env.NODE_ENV === "development";
    if (mailResult.mocked && isDev) {
      return res.status(200).json({
        message: "Password reset link logged to console (SMTP not configured in .env).",
        resetUrl,
      });
    }

    return res.status(200).json({ message: genericMsg });
  } catch (err) {
    console.error("forgotPassword error:", err);
    res.status(500).json({ message: "Could not generate reset link. Please try again." });
  }
};
 
exports.resetPassword = async (req, res) => {
  try {
    const crypto = require("crypto");
    const { token } = req.params;
    const { password } = req.body;
 
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select("+passwordResetToken +passwordResetExpires");

    if (!user) {
      return res.status(400).json({ message: "Reset link is invalid or has expired." });
    }

 
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshTokenHash = undefined;  
    await user.save();

    res.status(200).json({ message: "Password updated successfully. You can now sign in." });
  } catch (err) {
    console.error("resetPassword error:", err);
    res.status(500).json({ message: "Could not reset password. Please try again." });
  }
};

