const initials = (name = '') =>
  name
    .replace(/^Profesor(a)?\s+/i, '')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export default function UserAvatar({ user, size = 36, online = false, title }) {
  if (!user) return null;
  return (
    <span
      className="avatar"
      title={title ?? user.displayName ?? user.name}
      style={{ width: size, height: size, fontSize: size * 0.38, background: user.color }}
    >
      {initials(user.displayName ?? user.name)}
      {online && <span className="avatar__status" />}
    </span>
  );
}
