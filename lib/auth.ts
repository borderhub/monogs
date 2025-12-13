import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'admin@monogs.net' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // 開発環境用の簡易認証
        // 本番環境ではデータベースからユーザー情報を取得してください
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@monogs.net';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

        if (
          credentials.email === adminEmail &&
          credentials.password === adminPassword
        ) {
          return {
            id: '1',
            email: adminEmail,
            name: 'Admin',
          };
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});
