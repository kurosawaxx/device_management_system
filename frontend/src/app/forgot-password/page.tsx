'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/shared/api/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await apiClient.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch {
      setError('送信に失敗しました。しばらくしてから再試行してください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-md px-8 py-10">
          <h1 className="text-xl font-bold text-gray-800 text-center mb-1">
            パスワードをお忘れの方
          </h1>
          <p className="text-sm text-gray-500 text-center mb-8">
            登録済みのメールアドレスを入力してください
          </p>

          {submitted ? (
            <div className="text-center space-y-4">
              <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-4 text-sm text-green-700">
                入力されたアドレスにリセット用メールを送信しました（登録済みの場合）。
                メールをご確認ください。
              </div>
              <Link href="/signin" className="block text-sm text-blue-600 hover:underline mt-4">
                ログイン画面に戻る
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="email@example.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? '送信中...' : 'リセットメールを送信'}
                </button>
              </form>

              <div className="mt-5 text-center">
                <Link href="/signin" className="text-xs text-gray-400 hover:text-blue-600 transition-colors">
                  ログイン画面に戻る
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
