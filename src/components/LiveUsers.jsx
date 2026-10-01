import UserAvatar from './UserAvatar';

/** Usuarios conectados a una clase en vivo. */
export default function LiveUsers({ users, max = 5 }) {
  const visible = users.slice(0, max);
  const hidden = users.length - visible.length;

  return (
    <div className="live-users" title={users.map((user) => user.name).join(', ')}>
      <div className="live-users__avatars">
        {visible.map((user) => (
          <UserAvatar key={user.id} user={user} size={30} online title={user.name} />
        ))}
        {hidden > 0 && <span className="live-users__more">+{hidden}</span>}
      </div>
      <ul className="live-users__names">
        {visible.map((user) => (
          <li key={user.id}>
            <span className="live-dot" />
            {user.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
