// export default function ParticipantList({ participants, myUserId }) {
//   return (
//     <div>
//       <h3>Participants ({participants.length})</h3>
//       <ul className="participants">
//         {participants.map((p) => (
//           <li key={p.userId}>
//             <span>
//               {p.username}
//               {p.userId === myUserId && " (you)"}
//             </span>
//             <span className={`role role-${p.role}`}>{p.role}</span>
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// }


export default function ParticipantList({ participants = [], myUserId }) {
  return (
    <div>
      <h3>Participants ({participants.length})</h3>

      <ul className="participants">
        {participants.map((p) => (
          <li key={p.userId}>
            <span>
              {p.username}
              {p.userId === myUserId && " (you)"}
            </span>

            <span className={`role role-${p.role}`}>
              {p.role}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}