import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Vercel Serverless-এ ইন-মেমোরি স্টোর (প্রোডাকশনের জন্য Supabase/KV বেস্ট)
// এখানে ডাটাবেজ ডেমো হিসেবে গ্লোবাল ম্যাপ রাখা হয়েছে
declare global {
  var verifiedUsers: Map<string, { deviceHash: string; verifiedAt: number }> | undefined;
  var deviceToUsers: Map<string, Set<string>> | undefined;
}

if (!global.verifiedUsers) global.verifiedUsers = new Map();
if (!global.deviceToUsers) global.deviceToUsers = new Map();

export async function POST(req: Request) {
  try {
    const { userId, timestamp, signature, deviceHash } = await req.json();

    if (!userId || !timestamp || !signature || !deviceHash) {
      return NextResponse.json({ success: false, message: 'সবগুলো তথ্য দেওয়া হয়নি।' }, { status: 400 });
    }

    // ১. টোকেন মেয়াদ চেক (সর্বোচ্চ ১৫ মিনিট)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp)) > 900) {
      return NextResponse.json({ success: false, message: 'লিংকটির মেয়াদ শেষ হয়ে গেছে! বটের মাধ্যমে আবার চেষ্টা করুন।' }, { status: 400 });
    }

    // ২. সিগনেচার ভেরিফাই (জালিয়াতি বন্ধ করতে)
    const secret = process.env.VERIFY_SECRET_KEY || 'super-secret-key';
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`${userId}:${timestamp}`)
      .digest('hex');

    if (expectedSig !== signature) {
      return NextResponse.json({ success: false, message: 'ভুল বা অননুমোদিত লিংক!' }, { status: 403 });
    }

    // ৩. ডিভাইস লিমিট চেক
    const maxAccounts = parseInt(process.env.MAX_ACCOUNTS_PER_DEVICE || '1');
    const existingUsers = global.deviceToUsers!.get(deviceHash) || new Set();

    if (!existingUsers.has(String(userId)) && existingUsers.size >= maxAccounts) {
      return NextResponse.json({
        success: false,
        message: '❌ এই ডিভাইস থেকে ইতিমধ্যে অন্য একাউন্ট ভেরিফাই করা হয়েছে! একটি ডিভাইসে কেবল একটি একাউন্ট অনুমোদিত।'
      }, { status: 403 });
    }

    // ৪. ভেরিফিকেশন সংরক্ষণ
    existingUsers.add(String(userId));
    global.deviceToUsers!.set(deviceHash, existingUsers);
    global.verifiedUsers!.set(String(userId), {
      deviceHash,
      verifiedAt: Date.now()
    });

    // ৫. টেলিগ্রাম বটে কনফার্মেশন মেসেজ পাঠানো
    const botToken = process.env.BOT_TOKEN;
    if (botToken) {
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: userId,
            text: '✅ আপনার ডিভাইস ভেরিফিকেশন সফল হয়েছে!\n\nএখন বটের ফিচার ব্যবহার করতে /start চাপুন।'
          })
        });
      } catch (err) {
        console.error('Telegram message failed', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'ডিভাইস ভেরিফিকেশন সফল হয়েছে!'
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
    }
