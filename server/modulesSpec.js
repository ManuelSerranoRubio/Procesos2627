const rest = require("./modules.js");
describe("The system", function() {
  let system;
  beforeEach(function() {
    system=new rest.System()
  });
  it("Initially, there's no users", function() {
    expect(system.numberOfUsers()).toEqual(0);
  });
  it("After adding 3 users, the number of users should be 3", function() {
    system.addUser("user1");
    system.addUser("user2");
    system.addUser("user3");
    expect(system.numberOfUsers()).toEqual(3);
  });
  it("After adding a user, the user should be in the list of users", function() {
    system.addUser("user1");
    expect(system.userExists("user1")).toBe(true);
  });
  it("After removing a user, the user should not be in the list of users", function() {
    system.addUser("user1");
    system.removeUser("user1");
    expect(system.userExists("user1")).toBe(false);
  });
  it("After adding a user, the user should be found in the list of users", function() {
    system.addUser("user1");
    expect(system.findUser("user1")).toEqual(0);
  });
  it("After removing a user, the user should not be found in the list of users", function() {
    system.addUser("user1");
    system.removeUser("user1");
    expect(system.findUser("user1")).toBeUndefined();
  });
})