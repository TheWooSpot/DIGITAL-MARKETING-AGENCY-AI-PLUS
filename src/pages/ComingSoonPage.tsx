const ComingSoonPage = () => (
  <div style={{
    minHeight: '100vh',
    background: '#07090f',
    backgroundImage: `
      linear-gradient(rgba(201,153,58,0.07) 1px, transparent 1px),
      linear-gradient(90deg, rgba(201,153,58,0.07) 1px, transparent 1px)
    `,
    backgroundSize: '48px 48px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'system-ui, sans-serif',
    color: '#e8eef5',
    padding: '40px 24px',
    textAlign: 'center',
    position: 'relative',
  }}>
    <p style={{
      fontSize: '11px',
      letterSpacing: '0.28em',
      textTransform: 'uppercase',
      color: '#c9993a',
      margin: '0 0 20px'
    }}>
      SOCIALUTELY · AI MARKETING PLATFORM
    </p>
    <h1 style={{
      fontSize: '42px',
      fontWeight: 400,
      color: '#ffffff',
      margin: '0 0 20px',
      maxWidth: '560px',
      lineHeight: 1.2
    }}>
      Something Significant Is Coming
    </h1>
    <p style={{
      fontSize: '16px',
      color: 'rgba(232,238,245,0.65)',
      maxWidth: '440px',
      lineHeight: 1.7,
      margin: '0 0 60px'
    }}>
      We're putting the finishing touches on something
      built specifically for your business. Check back soon.
    </p>
    <div style={{
      position: 'absolute',
      bottom: '32px',
      fontSize: '12px',
      color: '#6a7d9a'
    }}>
      © Socialutely
    </div>
  </div>
);

export default ComingSoonPage;
