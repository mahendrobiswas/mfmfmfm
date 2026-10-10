import time
import hmac
import hashlib
import requests
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes

# কনফিগারেশন
BOT_TOKEN = "আপনার_টেলিগ্রাম_বট_টোকেন"
VERIFY_SECRET_KEY = "একটি_গোপন_পাসওয়ার্ড_বা_র‍্যান্ডম_কী_দিন" # Vercel এর সমান হতে হবে
VERCEL_APP_URL = "https://your-vercel-domain.vercel.app" # আপনার Vercel ডোমেন

# ভেরিফিকেশন লিংক জেনারেটর
def generate_verify_url(user_id: int) -> str:
    timestamp = str(int(time.time()))
    signature = hmac.new(
        VERIFY_SECRET_KEY.encode(),
        f"{user_id}:{timestamp}".encode(),
        hashlib.sha256
    ).hexdigest()
    return f"{VERCEL_APP_URL}?uid={user_id}&t={timestamp}&sig={signature}"

# Vercel ব্যাকএন্ড থেকে ভেরিফিকেশন চেক
def is_user_verified(user_id: int) -> bool:
    try:
        res = requests.get(f"{VERCEL_APP_URL}/api/check?userId={user_id}", timeout=5)
        if res.status_code == 200:
            return res.json().get("verified", False)
    except Exception as e:
        print("Verification check error:", e)
    return False

# /start হ্যান্ডলার
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    
    # ইউজার ভেরিফাইড কিনা দেখা
    if is_user_verified(user_id):
        await update.message.reply_text(
            f"স্বাগতম {update.effective_user.first_name}!\n"
            "আপনার ডিভাইস ইতিমধ্যে ভেরিফাইড। বটের সব সার্ভিস আপনার জন্য উন্মুক্ত।"
        )
        # এখানে আপনার বটের আসল মেনু বা বাটন দেখাবেন
    else:
        verify_url = generate_verify_url(user_id)
        keyboard = [
            [InlineKeyboardButton("🛡️ ডিভাইস ভেরিফাই করুন", url=verify_url)]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await update.message.reply_text(
            "⚠️ বটের সার্ভিস ব্যবহার করতে প্রথমে আপনার ডিভাইসটি ভেরিফাই করতে হবে।\n\n"
            "নিচের বাটনে চাপ দিয়ে ভেরিফিকেশন সম্পন্ন করুন:",
            reply_markup=reply_markup
        )

if __name__ == '__main__':
    app = ApplicationBuilder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    print("Bot is running...")
    app.run_polling()
