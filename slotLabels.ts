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

export const getTOSlotLabel = (slotNumber: number) => {
  switch (slotNumber) {
    case 1:
      return 'Scorer';
    case 2:
      return 'Assistant Scorer';
    case 3:
      return 'Timer';
    case 4:
      return '24sec Operator';
    default:
      return `TO ${slotNumber}`;
  }
};
