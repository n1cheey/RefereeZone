export const getNominationSlotLabel = (slotNumber: number) => {
  switch (slotNumber) {
    case 1:
      return 'Referee';
    case 2:
      return 'Umpire 1';
    case 3:
      return 'Umpire 2';
    default:
      return `Referee ${slotNumber}`;
  }
};
