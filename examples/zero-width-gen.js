const zeroPad = (num) => ‘00000000’.slice(String(num).length) + num;
const textToBinary = (username) => (
  username.split('').map(char =>
    zeroPad(char.charCodeAt(0).toString(2))).join(' ')
);


const binaryToZeroWidth = (binary) => (
    binary.split('').map((binaryNum) => {
      const num = parseInt(binaryNum, 10);
      if (num === 1) {
        return '​'; // zero-width space
      } else if (num === 0) {
        return '‌'; // zero-width non-joiner
      }
      return '‍'; // zero-width joiner
    }).join('') // zero-width no-break space
  );

  console.log(binaryToZeroWidth(textToBinary('hello')));